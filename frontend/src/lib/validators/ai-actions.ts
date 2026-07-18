import { z } from "zod";

import { taskPriorityEnum, taskStatusEnum } from "./task";

/**
 * AI Actions — structured payload schemas for actions the AI can propose and
 * the user can confirm directly from the chat interface.
 *
 * Discriminated union on `type` so the executor and UI can safely narrow.
 */

// ── Individual action schemas ─────────────────────────────────────────────────

export const createTaskActionSchema = z.object({
  type: z.literal("create_task"),
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  priority: taskPriorityEnum.default("MEDIUM"),
  status: taskStatusEnum.default("TODO"),
  dueDate: z.string().optional(), // ISO date YYYY-MM-DD
});
export type CreateTaskAction = z.infer<typeof createTaskActionSchema>;

export const updateTaskStatusActionSchema = z.object({
  type: z.literal("update_task_status"),
  taskTitle: z.string().min(1),
  newStatus: taskStatusEnum,
});
export type UpdateTaskStatusAction = z.infer<typeof updateTaskStatusActionSchema>;

export const createSubtasksActionSchema = z.object({
  type: z.literal("create_subtasks"),
  parentTaskTitle: z.string().min(1),
  subtasks: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        priority: taskPriorityEnum.default("MEDIUM"),
      }),
    )
    .min(1)
    .max(10),
});
export type CreateSubtasksAction = z.infer<typeof createSubtasksActionSchema>;

export const reprioritizeTasksActionSchema = z.object({
  type: z.literal("reprioritize_tasks"),
  changes: z
    .array(
      z.object({
        taskTitle: z.string().min(1),
        newPriority: taskPriorityEnum,
      }),
    )
    .min(1)
    .max(20),
});
export type ReprioritizeTasksAction = z.infer<typeof reprioritizeTasksActionSchema>;

export const assignTaskActionSchema = z.object({
  type: z.literal("assign_task"),
  taskTitle: z.string().min(1),
  assigneeEmail: z.string().email().optional(),
  assigneeName: z.string().optional(),
});
export type AssignTaskAction = z.infer<typeof assignTaskActionSchema>;

export const generateSprintTasksActionSchema = z.object({
  type: z.literal("generate_sprint_tasks"),
  goal: z.string().min(1).max(500),
  taskCount: z.number().int().min(3).max(12).default(6),
});
export type GenerateSprintTasksAction = z.infer<typeof generateSprintTasksActionSchema>;

// ── Discriminated union ───────────────────────────────────────────────────────

export const actionPayloadSchema = z.discriminatedUnion("type", [
  createTaskActionSchema,
  updateTaskStatusActionSchema,
  createSubtasksActionSchema,
  reprioritizeTasksActionSchema,
  assignTaskActionSchema,
  generateSprintTasksActionSchema,
]);
export type ActionPayload = z.infer<typeof actionPayloadSchema>;

// ── Execute-action endpoint schemas ──────────────────────────────────────────

export const executeActionInputSchema = z.object({
  action: actionPayloadSchema,
});
export type ExecuteActionInput = z.infer<typeof executeActionInputSchema>;

export const actionResultSchema = z.object({
  success: z.boolean(),
  actionType: z.string(),
  tasksCreated: z.number().int().optional(),
  tasksUpdated: z.number().int().optional(),
  message: z.string(),
});
export type ActionResult = z.infer<typeof actionResultSchema>;

// ── UI helpers ────────────────────────────────────────────────────────────────

/** Generates a human-readable description of an action for the preview card. */
export function describeAction(action: ActionPayload): string {
  switch (action.type) {
    case "create_task":
      return `Create task "${action.title}" (${action.priority} priority)`;
    case "update_task_status":
      return `Move "${action.taskTitle}" → ${action.newStatus.replace(/_/g, " ")}`;
    case "create_subtasks":
      return `Create ${action.subtasks.length} subtask${action.subtasks.length !== 1 ? "s" : ""} for "${action.parentTaskTitle}"`;
    case "reprioritize_tasks":
      return `Reprioritize ${action.changes.length} task${action.changes.length !== 1 ? "s" : ""}`;
    case "assign_task": {
      const who = action.assigneeName ?? action.assigneeEmail ?? "team member";
      return `Assign "${action.taskTitle}" to ${who}`;
    }
    case "generate_sprint_tasks":
      return `Generate ${action.taskCount} sprint tasks for "${action.goal}"`;
  }
}
