/**
 * memory.service.ts
 *
 * Orchestrates the AI Memory + Context Engine:
 *
 *   buildMemory  — aggregate all project data, chunk, embed, persist (SSE)
 *   getMemory    — return cached snapshot + freshness metadata
 *   getRAGContext — top-K retrieval for AI chat injection
 *   clearMemory  — delete the memory snapshot (triggers rebuild on next access)
 */

import { prisma } from "@/database";
import type {
  ProjectMemoryDTO,
  MemoryMetrics,
  TaskMemoryItem,
  DocumentMemoryItem,
  InsightMemoryItem,
  ConversationMemoryItem,
  RagContext,
} from "@/validators/memory";

import { NotFoundError } from "../../lib/http-errors.js";
import { logger } from "../../lib/logger.js";
import {
  generateEmbeddings,
  generateQueryEmbedding,
  cosineSimilarity,
  smartChunkText,
  buildTaskChunk,
  buildInsightChunk,
  buildConversationChunk,
} from "./memory.embedding.js";
import { memoryRepository, type CreateChunkInput } from "./memory.repository.js";

// ── Constants ─────────────────────────────────────────────────────────────────

const MEMORY_TTL_MS = 30 * 60 * 1000; // 30 minutes
const RAG_TOP_K = 5; // chunks injected into AI chat

// ── Service type ──────────────────────────────────────────────────────────────

export type MemoryService = ReturnType<typeof createMemoryService>;

// ── Stream event types ────────────────────────────────────────────────────────

export type MemoryStreamEvent =
  | {
      type: "progress";
      stage: "gathering" | "chunking" | "embedding" | "saving";
      message: string;
      progress?: number;
      total?: number;
    }
  | { type: "done"; memoryId: string; totalChunks: number; builtAt: Date }
  | { type: "error"; message: string };

// ── Service factory ───────────────────────────────────────────────────────────

export function createMemoryService(geminiApiKey: string) {
  return {
    // ── GET MEMORY ─────────────────────────────────────────────────────────────

    async getMemory(projectId: string, userId: string): Promise<ProjectMemoryDTO | null> {
      const memory = await memoryRepository.findByProject(projectId, userId);
      if (!memory) return null;

      const tasksJson = memory.tasksJson as TaskMemoryItem[];
      const documentsJson = memory.documentsJson as DocumentMemoryItem[];
      const insightsJson = (memory.insightsJson as unknown as InsightMemoryItem[]) ?? [];
      const conversationsJson =
        (memory.conversationsJson as unknown as ConversationMemoryItem[]) ?? [];
      const metricsJson = memory.metricsJson as MemoryMetrics;
      const teamJson = memory.teamJson as { members: string[] };
      const isFresh = Date.now() - memory.builtAt.getTime() < MEMORY_TTL_MS;

      // Confidence: 0-100 based on data completeness
      const confidenceScore = computeConfidence({
        taskCount: tasksJson.length,
        documentCount: documentsJson.length,
        insightCount: insightsJson.length,
        conversationCount: conversationsJson.length,
        hasPlan: memory.planJson !== null,
        totalChunks: memory.totalChunks,
        isFresh,
      });

      return {
        id: memory.id,
        projectId: memory.projectId,
        snapshotVersion: memory.snapshotVersion,
        totalChunks: memory.totalChunks,
        builtAt: memory.builtAt,
        tasks: tasksJson,
        documents: documentsJson,
        insights: insightsJson,
        conversations: conversationsJson,
        planSummary: (memory.planJson as { summary?: string } | null)?.summary ?? null,
        teamMembers: teamJson.members ?? [],
        metrics: metricsJson,
        isFresh,
        confidenceScore,
      };
    },

    // ── BUILD MEMORY (SSE) ─────────────────────────────────────────────────────

    async *buildMemory(
      projectId: string,
      userId: string,
    ): AsyncGenerator<MemoryStreamEvent, void, undefined> {
      // ── 1. Verify ownership ──────────────────────────────────────────────────
      const project = await prisma.project.findFirst({
        where: { id: projectId, ownerId: userId, deletedAt: null },
        select: { id: true, name: true, description: true },
      });
      if (!project) throw new NotFoundError("Project not found");

      // ── 2. Gather all data in parallel ───────────────────────────────────────
      yield { type: "progress", stage: "gathering", message: "Gathering project data…" };

      const [tasks, documents, insights, conversations, plan] = await Promise.all([
        prisma.task.findMany({
          where: { projectId, deletedAt: null },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            description: true,
            dueDate: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.projectDocument.findMany({
          where: { projectId, deletedAt: null },
          select: {
            id: true,
            originalName: true,
            status: true,
            summary: true,
            requirementsJson: true,
            deadlinesJson: true,
            risksJson: true,
            suggestedTasksJson: true,
            extractedText: true,
          },
        }),
        prisma.aiInsight.findMany({
          where: { projectId },
          select: { id: true, type: true, severity: true, content: true, updatedAt: true },
          orderBy: { updatedAt: "desc" },
          take: 30,
        }),
        prisma.aiConversation.findMany({
          where: { projectId, deletedAt: null },
          select: {
            id: true,
            title: true,
            updatedAt: true,
            _count: { select: { messages: true } },
            messages: {
              select: { role: true, content: true, createdAt: true },
              orderBy: { createdAt: "desc" },
              take: 6,
            },
          },
          orderBy: { updatedAt: "desc" },
          take: 10,
        }),
        prisma.projectPlan.findUnique({
          where: { projectId },
          select: { goal: true, markdown: true },
        }),
      ]);

      // ── 3. Build structured memory snapshots ─────────────────────────────────
      yield { type: "progress", stage: "chunking", message: "Creating memory chunks…" };

      const taskItems: TaskMemoryItem[] = tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        description: t.description,
        dueDate: t.dueDate,
        assignees: [],
      }));

      const documentItems: DocumentMemoryItem[] = documents.map((d) => ({
        id: d.id,
        originalName: d.originalName,
        status: d.status,
        summary: d.summary,
        requirementCount: Array.isArray(d.requirementsJson) ? d.requirementsJson.length : 0,
        deadlineCount: Array.isArray(d.deadlinesJson) ? d.deadlinesJson.length : 0,
        riskCount: Array.isArray(d.risksJson) ? d.risksJson.length : 0,
        suggestedTaskCount: Array.isArray(d.suggestedTasksJson) ? d.suggestedTasksJson.length : 0,
      }));

      const insightItems: InsightMemoryItem[] = insights.map((i) => ({
        id: i.id,
        type: i.type,
        severity: i.severity,
        contentPreview: i.content.slice(0, 300),
        updatedAt: i.updatedAt,
      }));

      const conversationItems: ConversationMemoryItem[] = conversations.map((c) => {
        const reversed = [...c.messages].reverse();
        const recentSummary = reversed
          .map((m) => `${m.role}: ${m.content.slice(0, 150)}`)
          .join("\n");
        return {
          id: c.id,
          title: c.title,
          messageCount: c._count.messages,
          recentSummary,
          updatedAt: c.updatedAt,
        };
      });

      const teamMembers: string[] = [];

      const now = new Date();
      const overdueTasks = tasks.filter(
        (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "DONE",
      );
      const metrics: MemoryMetrics = {
        totalTasks: tasks.length,
        completedTasks: tasks.filter((t) => t.status === "DONE").length,
        inProgressTasks: tasks.filter((t) => t.status === "IN_PROGRESS").length,
        overdueTasks: overdueTasks.length,
        completionRate:
          tasks.length > 0
            ? Math.round((tasks.filter((t) => t.status === "DONE").length / tasks.length) * 100)
            : 0,
        criticalInsights: insights.filter((i) => i.severity === "CRITICAL").length,
        documentCount: documents.length,
        readyDocuments: documents.filter((d) => d.status === "READY").length,
      };

      // ── 4. Build text chunks for embedding ───────────────────────────────────

      const chunkInputs: Omit<CreateChunkInput, "memoryId" | "embedding">[] = [];
      const chunkTexts: string[] = [];

      // Project overview (1 chunk)
      const projectChunk = [
        `Project: ${project.name}`,
        project.description ? `Description: ${project.description}` : "",
        `Team: ${teamMembers.join(", ") || "Solo project"}`,
        `Tasks: ${tasks.length} total, ${metrics.completedTasks} done (${metrics.completionRate}% completion)`,
        `Overdue: ${metrics.overdueTasks} tasks`,
        `Documents: ${documents.length} files`,
      ]
        .filter(Boolean)
        .join("\n");

      chunkTexts.push(projectChunk);
      chunkInputs.push({
        sourceType: "PROJECT",
        sourceId: projectId,
        content: projectChunk,
        metadata: { name: project.name },
        chunkIndex: 0,
      });

      // Task chunks (1 per task)
      let idx = chunkTexts.length;
      for (const task of tasks) {
        const text = buildTaskChunk({
          title: task.title,
          status: task.status,
          priority: task.priority,
          description: task.description,
          dueDate: task.dueDate,
          assignees: [],
        });
        chunkTexts.push(text);
        chunkInputs.push({
          sourceType: "TASK",
          sourceId: task.id,
          content: text,
          metadata: { title: task.title, status: task.status, priority: task.priority },
          chunkIndex: idx++,
        });
      }

      // Document chunks (summary + extracted text chunks)
      for (const doc of documents) {
        if (doc.summary) {
          const summaryText = [
            `Document: ${doc.originalName}`,
            `Summary: ${doc.summary.slice(0, 600)}`,
            doc.requirementsJson && Array.isArray(doc.requirementsJson)
              ? `Requirements: ${(doc.requirementsJson as { text?: string }[])
                  .map((r) => r.text)
                  .filter(Boolean)
                  .slice(0, 5)
                  .join("; ")}`
              : "",
            doc.risksJson && Array.isArray(doc.risksJson)
              ? `Risks: ${(doc.risksJson as { description?: string }[])
                  .map((r) => r.description)
                  .filter(Boolean)
                  .slice(0, 3)
                  .join("; ")}`
              : "",
          ]
            .filter(Boolean)
            .join("\n");

          chunkTexts.push(summaryText);
          chunkInputs.push({
            sourceType: "DOCUMENT",
            sourceId: doc.id,
            content: summaryText,
            metadata: { originalName: doc.originalName, status: doc.status },
            chunkIndex: idx++,
          });
        }

        // Chunk the extracted text for deeper search
        if (doc.extractedText) {
          const textChunks = smartChunkText(doc.extractedText, 1200);
          for (let ci = 0; ci < Math.min(textChunks.length, 10); ci++) {
            const chunkContent = `Document: ${doc.originalName}\n${textChunks[ci]}`;
            chunkTexts.push(chunkContent);
            chunkInputs.push({
              sourceType: "DOCUMENT",
              sourceId: doc.id,
              content: chunkContent,
              metadata: { originalName: doc.originalName, textChunkIndex: ci },
              chunkIndex: idx++,
            });
          }
        }
      }

      // Insight chunks (1 per insight)
      for (const insight of insights) {
        const text = buildInsightChunk({
          type: insight.type,
          severity: insight.severity,
          content: insight.content,
        });
        chunkTexts.push(text);
        chunkInputs.push({
          sourceType: "INSIGHT",
          sourceId: insight.id,
          content: text,
          metadata: { type: insight.type, severity: insight.severity },
          chunkIndex: idx++,
        });
      }

      // Conversation chunks (groups of messages)
      for (const conv of conversations) {
        if (conv._count.messages === 0) continue;
        const reversed = [...conv.messages].reverse();
        const GROUP_SIZE = 3;
        for (let g = 0; g < reversed.length; g += GROUP_SIZE) {
          const group = reversed.slice(g, g + GROUP_SIZE);
          const text = buildConversationChunk(
            conv.title,
            group.map((m) => `${m.role}: ${m.content}`),
          );
          chunkTexts.push(text);
          chunkInputs.push({
            sourceType: "CONVERSATION",
            sourceId: conv.id,
            content: text,
            metadata: { title: conv.title, groupIndex: Math.floor(g / GROUP_SIZE) },
            chunkIndex: idx++,
          });
        }
      }

      // Plan chunks
      if (plan) {
        const planHeader = `Project Plan: ${plan.goal}`;
        const planChunks = smartChunkText(plan.markdown, 1200);
        for (let pi = 0; pi < Math.min(planChunks.length, 8); pi++) {
          const text =
            pi === 0 ? `${planHeader}\n${planChunks[pi]}` : `Plan (continued): ${planChunks[pi]}`;
          chunkTexts.push(text);
          chunkInputs.push({
            sourceType: "PLAN",
            sourceId: projectId,
            content: text,
            metadata: { goal: plan.goal, sectionIndex: pi },
            chunkIndex: idx++,
          });
        }
      }

      // ── 5. Generate embeddings ───────────────────────────────────────────────
      const totalChunks = chunkTexts.length;
      const BATCH_REPORT = 50;

      let embeddingsGenerated = 0;
      const allEmbeddings: number[][] = [];

      yield {
        type: "progress",
        stage: "embedding",
        message: `Generating embeddings for ${totalChunks} memory chunks…`,
        progress: 0,
        total: totalChunks,
      };

      // Process in sub-batches with progress reporting
      const REPORT_BATCH = Math.min(BATCH_REPORT, totalChunks);
      for (let i = 0; i < chunkTexts.length; i += REPORT_BATCH) {
        const batchTexts = chunkTexts.slice(i, i + REPORT_BATCH);
        const batchEmbeddings = await generateEmbeddings(batchTexts, geminiApiKey);
        allEmbeddings.push(...batchEmbeddings);
        embeddingsGenerated += batchTexts.length;

        yield {
          type: "progress",
          stage: "embedding",
          message: `Embedding chunks… ${embeddingsGenerated}/${totalChunks}`,
          progress: embeddingsGenerated,
          total: totalChunks,
        };
      }

      // ── 6. Save to DB ────────────────────────────────────────────────────────
      yield { type: "progress", stage: "saving", message: "Saving memory snapshot…" };

      const memoryId = await memoryRepository.upsertMemory({
        projectId,
        snapshotVersion: 1,
        tasksJson: taskItems,
        documentsJson: documentItems,
        insightsJson: insightItems,
        conversationsJson: conversationItems,
        planJson: plan ? { goal: plan.goal, summary: plan.markdown.slice(0, 500) } : null,
        teamJson: { members: teamMembers },
        metricsJson: metrics,
        totalChunks,
      });

      // Attach embeddings to chunk inputs and bulk-insert
      const fullChunks: CreateChunkInput[] = chunkInputs.map((c, i) => ({
        ...c,
        memoryId,
        embedding: allEmbeddings[i] ?? null,
      }));

      await memoryRepository.createChunks(fullChunks);

      logger.info({ projectId, memoryId, totalChunks }, "memory.service: memory built");
      yield { type: "done", memoryId, totalChunks, builtAt: new Date() };
    },

    // ── RAG CONTEXT ────────────────────────────────────────────────────────────

    /**
     * Retrieve top-K relevant chunks for a user query and format them
     * as a context block for injection into the AI system prompt.
     *
     * Internal — called by the AI chat service. No auth check (project
     * ownership was already verified upstream).
     */
    async getRAGContext(
      projectId: string,
      userMessage: string,
      topK = RAG_TOP_K,
    ): Promise<RagContext> {
      const chunks = await memoryRepository.findChunks(projectId);
      if (chunks.length === 0) {
        return { contextText: "", chunksUsed: 0, sources: [] };
      }

      const queryEmbedding = await generateQueryEmbedding(userMessage, geminiApiKey);
      if (queryEmbedding.length === 0) {
        return { contextText: "", chunksUsed: 0, sources: [] };
      }

      const scored = chunks
        .filter((c) => Array.isArray(c.embedding) && c.embedding.length > 0)
        .map((c) => {
          const embedding = Array.isArray(c.embedding) ? (c.embedding as number[]) : [];

          return {
            chunk: c,
            score: cosineSimilarity(queryEmbedding, embedding),
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)
        .filter((x) => x.score > 0.1); // Only include reasonably relevant chunks

      if (scored.length === 0) {
        return { contextText: "", chunksUsed: 0, sources: [] };
      }

      const contextText = [
        "## 🔍 Relevant Context (retrieved from project memory)",
        ...scored.map(
          ({ chunk, score }, i) =>
            `[${i + 1}] (${chunk.sourceType}, relevance: ${(score * 100).toFixed(0)}%)\n${chunk.content}`,
        ),
      ].join("\n\n");

      return {
        contextText,
        chunksUsed: scored.length,
        sources: scored.map(({ chunk, score }) => ({
          sourceType: chunk.sourceType as RagContext["sources"][0]["sourceType"],
          sourceId: chunk.sourceId,
          score,
        })),
      };
    },

    /** Force-delete memory (triggers rebuild on next access). */
    async clearMemory(projectId: string, userId: string): Promise<void> {
      const project = await prisma.project.findFirst({
        where: { id: projectId, ownerId: userId, deletedAt: null },
        select: { id: true },
      });
      if (!project) throw new NotFoundError("Project not found");
      await memoryRepository.deleteByProject(projectId);
    },
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeConfidence(data: {
  taskCount: number;
  documentCount: number;
  insightCount: number;
  conversationCount: number;
  hasPlan: boolean;
  totalChunks: number;
  isFresh: boolean;
}): number {
  let score = 0;

  // Freshness (40%)
  if (data.isFresh) score += 40;

  // Data completeness (60%)
  if (data.taskCount > 0) score += 15;
  if (data.taskCount >= 5) score += 5;
  if (data.documentCount > 0) score += 10;
  if (data.insightCount > 0) score += 10;
  if (data.conversationCount > 0) score += 8;
  if (data.hasPlan) score += 7;
  if (data.totalChunks >= 10) score += 5;

  return Math.min(100, score);
}
