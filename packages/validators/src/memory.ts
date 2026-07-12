import { z } from "zod";
import { cuidSchema } from "./primitives";

// ============================================================
// Enums
// ============================================================

export const memorySourceEnum = z.enum([
  "TASK",
  "DOCUMENT",
  "INSIGHT",
  "CONVERSATION",
  "PLAN",
  "PROJECT",
]);

export type MemorySource = z.infer<typeof memorySourceEnum>;

// ============================================================
// Sub-schemas for memory snapshot data
// ============================================================

export const taskMemoryItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
  priority: z.string(),
  description: z.string().nullable(),
  dueDate: z.coerce.date().nullable(),
  assignees: z.array(z.string()),
});

export type TaskMemoryItem = z.infer<typeof taskMemoryItemSchema>;

export const documentMemoryItemSchema = z.object({
  id: z.string(),
  originalName: z.string(),
  status: z.string(),
  summary: z.string().nullable(),
  requirementCount: z.number(),
  deadlineCount: z.number(),
  riskCount: z.number(),
  suggestedTaskCount: z.number(),
});

export type DocumentMemoryItem = z.infer<
  typeof documentMemoryItemSchema
>;

export const insightMemoryItemSchema = z.object({
  id: z.string(),
  type: z.string(),
  severity: z.string(),
  contentPreview: z.string(),
  updatedAt: z.coerce.date(),
});

export type InsightMemoryItem = z.infer<
  typeof insightMemoryItemSchema
>;

export const conversationMemoryItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  messageCount: z.number(),
  recentSummary: z.string(),
  updatedAt: z.coerce.date(),
});

export type ConversationMemoryItem = z.infer<
  typeof conversationMemoryItemSchema
>;

export const memoryMetricsSchema = z.object({
  totalTasks: z.number(),
  completedTasks: z.number(),
  inProgressTasks: z.number(),
  overdueTasks: z.number(),
  completionRate: z.number(),
  criticalInsights: z.number(),
  documentCount: z.number(),
  readyDocuments: z.number(),
});

export type MemoryMetrics = z.infer<
  typeof memoryMetricsSchema
>;

// ============================================================
// Project Memory DTO
// ============================================================

export const projectMemoryDTO = z.object({
  id: cuidSchema,
  projectId: cuidSchema,
  snapshotVersion: z.number().int(),
  totalChunks: z.number().int(),
  builtAt: z.coerce.date(),

  tasks: z.array(taskMemoryItemSchema),
  documents: z.array(documentMemoryItemSchema),
  insights: z.array(insightMemoryItemSchema),
  conversations: z.array(conversationMemoryItemSchema),

  planSummary: z.string().nullable(),
  teamMembers: z.array(z.string()),

  metrics: memoryMetricsSchema,

  isFresh: z.boolean(),
  confidenceScore: z.number(),
});

export type ProjectMemoryDTO = z.infer<
  typeof projectMemoryDTO
>;

// ============================================================
// Memory Chunk DTO
// ============================================================

export const memoryChunkDTO = z.object({
  id: cuidSchema,
  memoryId: cuidSchema,
  sourceType: memorySourceEnum,
  sourceId: z.string(),
  content: z.string(),

  metadata: z
    .record(z.string(), z.unknown())
    .nullable(),

  chunkIndex: z.number().int(),
  createdAt: z.coerce.date(),
});

export type MemoryChunkDTO = z.infer<
  typeof memoryChunkDTO
>;

// ============================================================
// SSE stream events
// ============================================================

export const memoryStreamProgressEvent = z.object({
  type: z.literal("progress"),

  stage: z.enum([
    "gathering",
    "chunking",
    "embedding",
    "saving",
  ]),

  message: z.string(),

  progress: z.number().optional(),
  total: z.number().optional(),
});

export const memoryStreamDoneEvent = z.object({
  type: z.literal("done"),
  memoryId: cuidSchema,
  totalChunks: z.number().int(),
  builtAt: z.coerce.date(),
});

export const memoryStreamErrorEvent = z.object({
  type: z.literal("error"),
  message: z.string(),
});

export const memoryStreamEvent = z.discriminatedUnion(
  "type",
  [
    memoryStreamProgressEvent,
    memoryStreamDoneEvent,
    memoryStreamErrorEvent,
  ],
);

export type MemoryStreamEvent = z.infer<
  typeof memoryStreamEvent
>;

// ============================================================
// RAG context response
// ============================================================

export const ragContextSchema = z.object({
  contextText: z.string(),

  chunksUsed: z.number().int(),

  sources: z.array(
    z.object({
      sourceType: memorySourceEnum,
      sourceId: z.string(),
      score: z.number(),
    }),
  ),
});

export type RagContext = z.infer<
  typeof ragContextSchema
>;