import { prisma, type AiConversation, type AiMessage } from "@/database";

import type { SuggestedTask } from "@/validators/ai";
import { describeAction } from "@/validators/ai-actions";
import type { ActionPayload } from "@/validators/ai-actions";
import { NotFoundError, ServiceUnavailableError } from "../../lib/http-errors.js";
import { logger } from "../../lib/logger.js";
import { env } from "../../env.js";
import type { AiProvider } from "./ai.provider.js";
import { aiRepository } from "./ai.repository.js";
import { buildRichContext } from "./context-builder.service.js";
import { buildProductionSystemPrompt, buildContextSources } from "./prompt-builder.service.js";
import type { AiChatResult } from "./ai.types.js";
import { memoryService } from "../memory/index.js";
import { detectAction } from "./action-detector.service.js";

export function createAiService(provider: AiProvider) {
  return {
    // ── Conversations ──────────────────────────────────────────────────────────

    async listConversations(
      projectId: string,
      userId: string,
    ): Promise<(AiConversation & { _count: { messages: number } })[]> {
      await requireProject(projectId, userId);
      return aiRepository.listForProject(projectId, userId);
    },

    async createConversation(
      projectId: string,
      userId: string,
      title?: string,
    ): Promise<AiConversation & { _count: { messages: number } }> {
      await requireProject(projectId, userId);
      return aiRepository.create({ projectId, userId, title });
    },

    async deleteConversation(conversationId: string, userId: string): Promise<void> {
      const count = await aiRepository.softDelete(conversationId, userId);
      if (count === 0) throw new NotFoundError("Conversation not found");
    },

    // ── Messages ───────────────────────────────────────────────────────────────

    async listMessages(conversationId: string, userId: string): Promise<AiMessage[]> {
      const conversation = await aiRepository.findByIdForUser(conversationId, userId);
      if (!conversation) throw new NotFoundError("Conversation not found");
      return aiRepository.listMessages(conversationId);
    },

    /**
     * Stream a chat response via SSE.
     *
     * Lifecycle:
     *   1. Validate ownership
     *   2. Persist user message
     *   3. Build project context (name + task board)
     *   4. Load conversation history for multi-turn memory
     *   5. Stream Gemini response (yield text chunks)
     *   6. Persist assistant message with token usage
     *   7. Auto-set title from first message
     */
    async *streamChat(
      conversationId: string,
      userId: string,
      userContent: string,
    ): AsyncGenerator<
      | { type: "context"; sources: Array<{ type: string; count: number; label: string }>; ragChunksUsed: number }
      | { type: "chunk"; content: string }
      | { type: "action"; payload: ActionPayload; description: string }
      | { type: "done"; userMessageId: string; aiMessageId: string },
      void,
      undefined
    > {
      const conversation = await aiRepository.findByIdForUser(conversationId, userId);
      if (!conversation) throw new NotFoundError("Conversation not found");

      // Build rich context (task board, overdue analysis, activity, plan, team).
      // Uses a 5-minute cache so repeated messages in one session don't re-query everything.
      const richContext = await buildRichContext(conversation.projectId, userId);
      if (!richContext) throw new NotFoundError("Project not found");

      const userMessage = await aiRepository.createMessage({
        conversationId,
        role: "USER",
        content: userContent,
      });

      if (conversation._count.messages === 0) {
        await aiRepository.updateTitle(conversationId, userContent.slice(0, 80).trim());
      }

      const history = await aiRepository.listMessages(conversationId);
      const historyForProvider = history
        .filter((m) => m.id !== userMessage.id)
        .map((m) => ({ role: m.role as "USER" | "ASSISTANT", content: m.content }));

      // ── RAG: retrieve semantically relevant memory chunks ─────────────────────
      let rag: Awaited<ReturnType<typeof memoryService.getRAGContext>> = {
        contextText: "",
        chunksUsed: 0,
        sources: [],
      };
      try {
        rag = await memoryService.getRAGContext(conversation.projectId, userContent, 4);
      } catch {
        // RAG is best-effort — never block chat if memory retrieval fails
      }

      // ── Build production-grade system prompt with all context sources ──────────
      const systemPrompt = buildProductionSystemPrompt(richContext, rag);

      // ── Emit context metadata before first chunk (frontend context indicator) ──
      yield {
        type: "context",
        sources: buildContextSources(richContext, rag),
        ragChunksUsed: rag.chunksUsed,
      };

      let fullContent = "";
      let chatResult: AiChatResult | undefined;

      try {
        const generator = provider.streamChat({
          history: historyForProvider,
          userMessage: userContent,
          systemPrompt,
        });

        let iterResult = await generator.next();
        while (!iterResult.done) {
          const chunk = iterResult.value as string;
          fullContent += chunk;
          yield { type: "chunk", content: chunk };
          iterResult = await generator.next();
        }
        chatResult = iterResult.value as AiChatResult;
      } catch (err) {
        logger.error(
          {
            err,
            conversationId,
            geminiStatus: (err as Record<string, unknown>).status,
            geminiStatusText: (err as Record<string, unknown>).statusText,
            geminiErrorDetails: (err as Record<string, unknown>).errorDetails,
          },
          "AI provider stream failed",
        );
        await aiRepository.createMessage({
          conversationId,
          role: "ASSISTANT",
          content: `I encountered an error: ${err instanceof Error ? err.message : "AI service error"}. Please try again.`,
        });
        const isGeminiError =
          typeof (err as Record<string, unknown>).status === "number" ||
          (err instanceof Error && err.message.includes("API key"));
        throw new ServiceUnavailableError(
          isGeminiError ? "AI provider rejected the request — check server logs" : "AI provider error",
        );
      }

      const aiMessage = await aiRepository.createMessage({
        conversationId,
        role: "ASSISTANT",
        content: fullContent,
        promptTokens: chatResult?.promptTokens,
        completionTokens: chatResult?.completionTokens,
      });

      await prisma.aiConversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      // Best-effort action detection — runs after AI message is persisted.
      // Emits an `action` event only when Gemini detects a clear PM intent.
      if (env.GEMINI_API_KEY) {
        try {
          const detectedAction = await detectAction(userContent, richContext, env.GEMINI_API_KEY);
          if (detectedAction) {
            yield {
              type: "action",
              payload: detectedAction,
              description: describeAction(detectedAction),
            };
          }
        } catch {
          // Never block chat completion on detection failures
        }
      }

      yield { type: "done", userMessageId: userMessage.id, aiMessageId: aiMessage.id };
    },

    // ── AI Task Suggestions ────────────────────────────────────────────────────

    async suggestTasks(
      projectId: string,
      userId: string,
      userPrompt: string,
    ): Promise<SuggestedTask[]> {
      const project = await prisma.project.findFirst({
        where: { id: projectId, ownerId: userId, deletedAt: null },
        select: { name: true, description: true },
      });
      if (!project) throw new NotFoundError("Project not found");

      return provider.suggestTasks({
        projectName: project.name,
        projectDescription: project.description,
        userPrompt,
      });
    },
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function requireProject(projectId: string, userId: string): Promise<void> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: userId, deletedAt: null },
    select: { id: true },
  });
  if (!project) throw new NotFoundError("Project not found");
}
