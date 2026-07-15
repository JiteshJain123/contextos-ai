import { z } from "zod";

import { cuidSchema } from "./primitives";

/**
 * Task-domain schemas.
 *
 * Enum values are UPPERCASE to align with Postgres/Prisma enum convention.
 * A status string flows through API ↔ DB ↔ UI without case normalization.
 */

// ============== Enums ==============
export const taskStatusEnum = z.enum(["TODO", "IN_PROGRESS", "REVIEW", "DONE"]);
export type TaskStatus = z.infer<typeof taskStatusEnum>;

export const taskPriorityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);
export type TaskPriority = z.infer<typeof taskPriorityEnum>;

const taskTitleSchema = z
  .string()
  .min(1, "Task title is required")
  .max(200, "Title must be at most 200 characters")
  .transform((v) => v.trim());

const taskDescriptionSchema = z
  .string()
  .max(5000, "Description must be at most 5000 characters")
  .optional();

// ============== Create ==============
// projectId comes from the URL path (/projects/:projectId/tasks), not the body.
// Note: status/priority are REQUIRED (no `.default()` in the schema). Callers
// — forms or API consumers — supply them explicitly. This keeps Zod's input
// and output types identical, avoiding zodResolver/RHF type-inference pain.
export const createTaskSchema = z.object({
  title: taskTitleSchema,
  description: taskDescriptionSchema,
  status: taskStatusEnum,
  priority: taskPriorityEnum,
  startDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  position: z.coerce.number().optional(),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

// ============== Update ==============
// Written explicitly (not via .partial()) so dueDate can accept null,
// which signals "clear the due date". undefined means "leave unchanged".
export const updateTaskSchema = z.object({
  title: taskTitleSchema.optional(),
  description: taskDescriptionSchema.optional(),
  status: taskStatusEnum.optional(),
  priority: taskPriorityEnum.optional(),
  startDate: z.union([z.coerce.date(), z.null()]).optional(),
  dueDate: z.union([z.coerce.date(), z.null()]).optional(),
  position: z.coerce.number().optional(),
});
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

// ============== Quick status update (drag-drop) ==============
// New status + the new fractional position computed client-side from neighbors.
export const updateTaskStatusSchema = z.object({
  status: taskStatusEnum,
  position: z.coerce.number().optional(),
});
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;

// ============== Task DTO ==============
export const taskDTO = z.object({
  id: cuidSchema,
  projectId: cuidSchema,
  createdById: cuidSchema,
  title: z.string(),
  description: z.string().nullable(),
  status: taskStatusEnum,
  priority: taskPriorityEnum,
  startDate: z.date().nullable(),
  dueDate: z.date().nullable(),
  position: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type TaskDTO = z.infer<typeof taskDTO>;

// ============== Batch Create ==============
export const batchCreateTasksSchema = z.object({
  tasks: z.array(createTaskSchema).min(1, "At least one task is required").max(50, "Cannot batch-create more than 50 tasks"),
});
export type BatchCreateTasksInput = z.infer<typeof batchCreateTasksSchema>;

// ============== AI Task Breakdown ==============

export const taskCategoryEnum = z.enum(["frontend", "backend", "database", "testing", "deployment"]);
export type TaskCategory = z.infer<typeof taskCategoryEnum>;

export const taskComplexityEnum = z.enum(["XS", "S", "M", "L", "XL"]);
export type TaskComplexity = z.infer<typeof taskComplexityEnum>;

export const breakdownGoalSchema = z.object({
  goal: z
    .string()
    .min(3, "Goal must be at least 3 characters")
    .max(1000, "Goal must be at most 1000 characters")
    .transform((v) => v.trim()),
});
export type BreakdownGoalInput = z.infer<typeof breakdownGoalSchema>;

// A single task proposed by the AI breakdown.
// `estimatedEffort` is UI-only — it is NOT stored in the database.
export const breakdownTaskItemSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  priority: taskPriorityEnum.default("MEDIUM"),
  status: taskStatusEnum.default("TODO"),
  estimatedEffort: z.string().max(50).optional(),
});
export type BreakdownTaskItem = z.infer<typeof breakdownTaskItemSchema>;
