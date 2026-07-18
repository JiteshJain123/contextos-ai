import { z } from "zod";
import { cuidSchema } from "./primitives";

// ── Create ────────────────────────────────────────────────────────────────────

export const createMilestoneSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be at most 200 characters")
    .transform((v) => v.trim()),
  description: z.string().max(1000).optional(),
  targetDate: z.coerce.date(),
});
export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;

// ── Update ────────────────────────────────────────────────────────────────────

export const updateMilestoneSchema = z.object({
  title: z
    .string()
    .min(1)
    .max(200)
    .transform((v) => v.trim())
    .optional(),
  description: z.union([z.string().max(1000), z.null()]).optional(),
  targetDate: z.coerce.date().optional(),
  completed: z.boolean().optional(),
});
export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>;

// ── DTO ───────────────────────────────────────────────────────────────────────

export const milestoneDTO = z.object({
  id: cuidSchema,
  projectId: cuidSchema,
  title: z.string(),
  description: z.string().nullable(),
  targetDate: z.coerce.date(),
  completed: z.boolean(),
  completedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type MilestoneDTO = z.infer<typeof milestoneDTO>;
