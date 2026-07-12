import type { TaskStatus } from "@contextos-ai/validators/task";

/**
 * Single source of truth for status presentation.
 *
 * Adding a new status: update the Prisma enum + validator + this file.
 * TypeScript's exhaustive `satisfies Record<TaskStatus, ...>` guarantees you
 * can't forget the UI mapping.
 */

export const TASK_STATUSES: readonly TaskStatus[] = [
  "TODO",
  "IN_PROGRESS",
  "REVIEW",
  "DONE",
] as const;

export const statusMeta = {
  TODO: { label: "To do", dot: "bg-muted-foreground/60" },
  IN_PROGRESS: { label: "In progress", dot: "bg-blue-500" },
  REVIEW: { label: "Review", dot: "bg-amber-500" },
  DONE: { label: "Done", dot: "bg-emerald-500" },
} as const satisfies Record<TaskStatus, { label: string; dot: string }>;
