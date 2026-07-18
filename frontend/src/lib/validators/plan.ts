import { z } from "zod";

import { cuidSchema } from "./primitives";

// ============== Input schemas ==============

export const generatePlanInputSchema = z.object({
  goal: z
    .string()
    .min(10, "Goal must be at least 10 characters")
    .max(2000, "Goal must be at most 2000 characters")
    .transform((v) => v.trim()),
});
export type GeneratePlanInput = z.infer<typeof generatePlanInputSchema>;

export const updatePlanSchema = z.object({
  markdown: z.string().min(1).max(200_000).optional(),
  goal: z
    .string()
    .min(10)
    .max(2000)
    .transform((v) => v.trim())
    .optional(),
});
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;

// ============== SSE stream events ==============

export const planStreamChunkEvent = z.object({ type: z.literal("chunk"), content: z.string() });
export const planStreamTasksSavedEvent = z.object({
  type: z.literal("tasks_saved"),
  count: z.number().int().nonnegative(),
});
export const planStreamDoneEvent = z.object({
  type: z.literal("done"),
  planId: cuidSchema,
});
export const planStreamErrorEvent = z.object({
  type: z.literal("error"),
  message: z.string(),
});

export const planStreamEvent = z.discriminatedUnion("type", [
  planStreamChunkEvent,
  planStreamTasksSavedEvent,
  planStreamDoneEvent,
  planStreamErrorEvent,
]);
export type PlanStreamEvent = z.infer<typeof planStreamEvent>;

// ============== Plan DTO ==============

export const planDTO = z.object({
  id: cuidSchema,
  projectId: cuidSchema,
  goal: z.string(),
  markdown: z.string(),
  metadata: z.unknown().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type PlanDTO = z.infer<typeof planDTO>;
