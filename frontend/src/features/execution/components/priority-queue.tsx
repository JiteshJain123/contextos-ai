"use client";

import { Flame, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/cn";
import type { TaskDTO, TaskPriority } from "@/lib/validators/task";

// ─── Config ───────────────────────────────────────────────────────────────────

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

const PRIORITY_CONFIG: Record<
  TaskPriority,
  { label: string; icon: typeof Flame; badgeClass: string }
> = {
  URGENT: {
    label: "Urgent",
    icon: Flame,
    badgeClass: "bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-400",
  },
  HIGH: {
    label: "High",
    icon: AlertTriangle,
    badgeClass: "bg-orange-100 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400",
  },
  MEDIUM: {
    label: "Medium",
    icon: AlertTriangle,
    badgeClass: "bg-yellow-100 text-yellow-600 dark:bg-yellow-950/30 dark:text-yellow-500",
  },
  LOW: {
    label: "Low",
    icon: AlertTriangle,
    badgeClass: "bg-muted text-muted-foreground",
  },
};

const STATUS_LABEL: Record<string, string> = {
  TODO: "Todo",
  IN_PROGRESS: "In Progress",
  REVIEW: "Review",
  DONE: "Done",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDueDateInfo(date: Date): { label: string; isOverdue: boolean } {
  const now = new Date();
  const diffMs   = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / 86_400_000);
  const isOverdue = date < now;

  if (isOverdue) {
    const days = Math.abs(diffDays);
    return { label: days <= 1 ? "Today" : `${days}d overdue`, isOverdue: true };
  }
  if (diffDays <= 0) return { label: "Today", isOverdue: false };
  if (diffDays === 1) return { label: "Tomorrow", isOverdue: false };
  return { label: `${diffDays}d left`, isOverdue: false };
}

// ─── Task row ─────────────────────────────────────────────────────────────────

function TaskRow({ task }: { task: TaskDTO }) {
  const cfg = PRIORITY_CONFIG[task.priority];
  const PriorityIcon = cfg.icon;
  const due = task.dueDate ? getDueDateInfo(new Date(task.dueDate)) : null;

  return (
    <div className="flex items-center gap-2.5 py-2.5 first:pt-0 last:pb-0">
      {/* Priority badge */}
      <span
        className={cn(
          "flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
          cfg.badgeClass,
        )}
      >
        <PriorityIcon className="size-2.5" />
        {cfg.label}
      </span>

      {/* Title */}
      <span className="min-w-0 flex-1 truncate text-[12px] font-medium leading-snug">
        {task.title}
      </span>

      {/* Right: status + due date */}
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-[10px] text-muted-foreground/70">
          {STATUS_LABEL[task.status] ?? task.status}
        </span>
        {due && (
          <span
            className={cn(
              "flex items-center gap-0.5 text-[10px] font-medium",
              due.isOverdue ? "text-red-500" : "text-muted-foreground/60",
            )}
          >
            <Clock className="size-2.5" />
            {due.label}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

interface PriorityQueueProps {
  tasks: TaskDTO[];
}

export function PriorityQueuePanel({ tasks }: PriorityQueueProps) {
  // Top urgent/high priority tasks not yet done, sorted by priority → due date
  const queued = tasks
    .filter(
      (t) =>
        t.status !== "DONE" &&
        (t.priority === "URGENT" || t.priority === "HIGH"),
    )
    .sort((a, b) => {
      const pDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (pDiff !== 0) return pDiff;
      // Due date: earliest first; tasks without due date sort last
      if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    })
    .slice(0, 8);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold">Priority Queue</h3>
        <p className="text-[11px] text-muted-foreground">
          {queued.length > 0
            ? `${queued.length} urgent / high-priority task${queued.length === 1 ? "" : "s"} pending`
            : "No urgent or high-priority tasks pending"}
        </p>
      </div>

      {queued.length === 0 ? (
        <div className="flex h-24 flex-col items-center justify-center gap-1.5 rounded-lg bg-muted/30">
          <CheckCircle2 className="size-4 text-emerald-500/60" />
          <p className="text-[11px] text-muted-foreground/60">All priority tasks resolved</p>
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          {queued.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}
