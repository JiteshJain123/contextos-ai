import { z } from "zod";

import { cuidSchema } from "./primitives";
import { actionPayloadSchema } from "./ai-actions";

/**
 * AI domain schemas — conversations and messages.
 *
 * Pattern:
 *   - createConversationSchema / sendMessageSchema → input validation
 *   - conversationDTO / messageDTO → response shape clients consume
 *   - AiMessageRole mirrors the Prisma enum (UPPERCASE for Postgres convention)
 */

// ============== Role enum ==============
export const aiMessageRoleEnum = z.enum(["USER", "ASSISTANT"]);
export type AiMessageRole = z.infer<typeof aiMessageRoleEnum>;

// ============== Conversation ==============
export const createConversationSchema = z.object({
  title: z
    .string()
    .min(1)
    .max(200)
    .transform((v) => v.trim())
    .optional(),
});
export type CreateConversationInput = z.infer<typeof createConversationSchema>;

export const conversationDTO = z.object({
  id: cuidSchema,
  title: z.string(),
  projectId: cuidSchema,
  userId: cuidSchema,
  messageCount: z.number().int().nonnegative(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type ConversationDTO = z.infer<typeof conversationDTO>;

// ============== Message ==============
export const sendMessageSchema = z.object({
  content: z
    .string()
    .min(1, "Message cannot be empty")
    .max(10_000, "Message must be at most 10000 characters")
    .transform((v) => v.trim()),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const messageDTO = z.object({
  id: cuidSchema,
  role: aiMessageRoleEnum,
  content: z.string(),
  conversationId: cuidSchema,
  promptTokens: z.number().int().nonnegative().nullable(),
  completionTokens: z.number().int().nonnegative().nullable(),
  createdAt: z.date(),
});
export type MessageDTO = z.infer<typeof messageDTO>;

// ============== AI Task Suggestions ==============
export const suggestTasksInputSchema = z.object({
  prompt: z
    .string()
    .min(1, "Prompt is required")
    .max(2000, "Prompt must be at most 2000 characters")
    .transform((v) => v.trim()),
});
export type SuggestTasksInput = z.infer<typeof suggestTasksInputSchema>;

export const suggestedTaskItemSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
});
export type SuggestedTask = z.infer<typeof suggestedTaskItemSchema>;

// ============== SSE stream event shapes (for type safety on client) ==============
export const streamChunkEvent = z.object({ type: z.literal("chunk"), content: z.string() });
export const streamDoneEvent = z.object({
  type: z.literal("done"),
  userMessageId: cuidSchema,
  aiMessageId: cuidSchema,
});
export const streamErrorEvent = z.object({ type: z.literal("error"), message: z.string() });

// Context sources event — emitted once per stream, before the first chunk,
// telling the frontend which data sources were loaded for this response.
export const contextSourceSchema = z.object({
  type: z.string(),
  count: z.number().int(),
  label: z.string(),
});
export type ContextSource = z.infer<typeof contextSourceSchema>;

export const streamContextEvent = z.object({
  type: z.literal("context"),
  sources: z.array(contextSourceSchema),
  ragChunksUsed: z.number().int(),
});
export type StreamContextEvent = z.infer<typeof streamContextEvent>;

// Action event — emitted after streaming completes when the AI detects an
// actionable request (create task, update status, etc). User must confirm.
export const streamActionEvent = z.object({
  type: z.literal("action"),
  payload: actionPayloadSchema,
  description: z.string(),
});
export type StreamActionEvent = z.infer<typeof streamActionEvent>;

export const streamEvent = z.discriminatedUnion("type", [
  streamChunkEvent,
  streamDoneEvent,
  streamErrorEvent,
  streamContextEvent,
  streamActionEvent,
]);
export type StreamEvent = z.infer<typeof streamEvent>;
