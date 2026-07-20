import type {
  ConversationDTO,
  CreateConversationInput,
  MessageDTO,
  StreamEvent,
  SuggestedTask,
} from "@/lib/validators/ai";
import type { ActionPayload, ActionResult } from "@/lib/validators/ai-actions";

import { api } from "@/lib/api-client";
import { clientEnv } from "@/env/client";

const API_BASE = `${clientEnv.NEXT_PUBLIC_API_URL}/api/v1`;

/**
 * HTTP layer for the AI domain.
 *
 * `streamChat` is an AsyncGenerator — it yields parsed SSE events as they
 * arrive so the UI can update in real-time without buffering the full response.
 */
export const aiApi = {
  // ──────────────────────────────────────────
  // Conversations
  // ──────────────────────────────────────────

  listConversations: (projectId: string) =>
    api.get<ConversationDTO[]>(`/projects/${projectId}/conversations`),

  createConversation: (projectId: string, input?: CreateConversationInput) =>
    api.post<ConversationDTO>(`/projects/${projectId}/conversations`, input ?? {}),

  deleteConversation: (conversationId: string) =>
    api.delete<void>(`/conversations/${conversationId}`),

  // ──────────────────────────────────────────
  // Messages
  // ──────────────────────────────────────────

  listMessages: (conversationId: string) =>
    api.get<MessageDTO[]>(`/conversations/${conversationId}/messages`),

  suggestTasks: (projectId: string, prompt: string) =>
    api.post<{ tasks: SuggestedTask[] }>(`/projects/${projectId}/conversations/suggest-tasks`, { prompt }),

  executeAction: (conversationId: string, action: ActionPayload) =>
    api.post<ActionResult>(`/conversations/${conversationId}/execute-action`, { action }),

  /**
   * Send a message and stream the AI response.
   *
   * Uses native fetch + ReadableStream instead of the typed `api.*` helpers
   * because TanStack Query / the api wrapper await the full JSON body — they
   * can't handle a streaming SSE response.
   */
  async *streamChat(
    conversationId: string,
    content: string,
  ): AsyncGenerator<StreamEvent, void, undefined> {
    const response = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      credentials: "include",
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      let message = `Request failed: ${response.status}`;
      try {
        const body = (await response.json()) as { error?: { message?: string } };
        message = body?.error?.message ?? message;
      } catch {
        // not JSON
      }
      yield { type: "error", message };
      return;
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by double newlines.
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? ""; // keep the incomplete trailing part

      for (const part of parts) {
        const line = part.trim();
        if (!line.startsWith("data: ")) continue;
        try {
          const event = JSON.parse(line.slice(6)) as StreamEvent;
          yield event;
        } catch {
          // malformed event — skip
        }
      }
    }
  },
};
