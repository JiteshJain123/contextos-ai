import { z } from "zod";
import { taskStatusEnum, taskPriorityEnum } from "./task";

// ── Calendar task (minimal shape for rendering) ───────────────────────────────

export const calendarTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: taskStatusEnum,
  priority: taskPriorityEnum,
  startDate: z.coerce.date().nullable(),
  dueDate: z.coerce.date().nullable(),
});
export type CalendarTask = z.infer<typeof calendarTaskSchema>;

// ── Milestone ─────────────────────────────────────────────────────────────────

export const calendarMilestoneSchema = z.object({
  id: z.string(),
  title: z.string(),
  targetDate: z.coerce.date(),
  completed: z.boolean(),
});
export type CalendarMilestone = z.infer<typeof calendarMilestoneSchema>;

// ── Document deadline ─────────────────────────────────────────────────────────

export const documentDeadlineSchema = z.object({
  id: z.string(),
  documentName: z.string(),
  date: z.coerce.date(),
  description: z.string(),
});
export type DocumentDeadline = z.infer<typeof documentDeadlineSchema>;

// ── Combined calendar response ────────────────────────────────────────────────

export const calendarDataSchema = z.object({
  tasks: z.array(calendarTaskSchema),
  milestones: z.array(calendarMilestoneSchema),
  documentDeadlines: z.array(documentDeadlineSchema),
});
export type CalendarData = z.infer<typeof calendarDataSchema>;
