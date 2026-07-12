"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { motion } from "motion/react";

import type { TaskDTO, TaskStatus } from "@contextos-ai/validators/task";

import { cn } from "@/lib/cn";

import { statusMeta } from "../lib/status";
import { CreateTaskDialog } from "./create-task-dialog";
import { TaskCard } from "./task-card";

const EMPTY_HINT: Record<TaskStatus, string> = {
  TODO: "Add tasks to get started",
  IN_PROGRESS: "Drag a task here to start",
  REVIEW: "Move tasks here when ready",
  DONE: "Completed tasks appear here",
};

const COLUMN_HEADER_ACCENT: Record<TaskStatus, string> = {
  TODO: "border-t-slate-400/40",
  IN_PROGRESS: "border-t-blue-500/50",
  REVIEW: "border-t-violet-500/50",
  DONE: "border-t-emerald-500/50",
};

const COLUMN_HEADER_DOT_GLOW: Record<TaskStatus, string> = {
  TODO: "",
  IN_PROGRESS: "shadow-[0_0_6px_2px_rgba(59,130,246,0.3)]",
  REVIEW: "shadow-[0_0_6px_2px_rgba(139,92,246,0.3)]",
  DONE: "shadow-[0_0_6px_2px_rgba(16,185,129,0.3)]",
};

export function KanbanColumn({
  status,
  tasks,
  projectId,
}: {
  status: TaskStatus;
  tasks: TaskDTO[];
  projectId: string;
}) {
  const meta = statusMeta[status];
  const { setNodeRef, isOver } = useDroppable({ id: status, data: { type: "column", status } });
  const ids = tasks.map((t) => t.id);

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col rounded-xl border-t-2 border border-border",
        "bg-muted/20 dark:bg-muted/10",
        "transition-all duration-200",
        COLUMN_HEADER_ACCENT[status],
        isOver && "bg-primary/5 border-primary/20 shadow-sm",
      )}
    >
      <header className="flex items-center justify-between border-b border-border/50 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "size-2 rounded-full",
              meta.dot,
              COLUMN_HEADER_DOT_GLOW[status],
            )}
            aria-hidden="true"
          />
          <h3 className="text-sm font-semibold">{meta.label}</h3>
          {tasks.length > 0 && (
            <motion.span
              key={tasks.length}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground tabular-nums"
            >
              {tasks.length}
            </motion.span>
          )}
        </div>
        <CreateTaskDialog
          projectId={projectId}
          defaultStatus={status}
          triggerLabel=""
          triggerVariant="ghost"
        />
      </header>

      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[140px] flex-1 flex-col gap-2 p-2",
          "transition-colors duration-200",
        )}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <AnimatePresence initial={false}>
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} projectId={projectId} />
            ))}
          </AnimatePresence>
        </SortableContext>

        {tasks.length === 0 && <EmptyColumnHint status={status} isOver={isOver} />}
      </div>
    </div>
  );
}

function EmptyColumnHint({ status, isOver }: { status: TaskStatus; isOver: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2.5 rounded-lg py-9 text-center",
        "border border-dashed",
        "transition-all duration-200",
        isOver
          ? "border-primary/40 bg-primary/5 shadow-inner"
          : "border-border/30",
      )}
      aria-hidden="true"
    >
      <div
        className={cn(
          "flex size-8 items-center justify-center rounded-full transition-all duration-200",
          isOver ? "bg-primary/15 scale-110" : "bg-muted/40",
        )}
      >
        <Plus
          className={cn(
            "size-3.5 transition-colors",
            isOver ? "text-primary" : "text-muted-foreground/25",
          )}
        />
      </div>
      <p className="max-w-[110px] text-[11px] leading-snug text-muted-foreground/40">
        {EMPTY_HINT[status]}
      </p>
    </div>
  );
}

