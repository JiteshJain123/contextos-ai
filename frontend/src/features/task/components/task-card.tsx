"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, X } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

import type { TaskDTO } from "@/lib/validators/task";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/cn";

import { useDeleteTask } from "../hooks/use-delete-task";
import { DueDateDisplay } from "./due-date-display";
import { EditTaskDialog } from "./edit-task-dialog";
import { PriorityBadge } from "./priority-badge";

export function TaskCard({
  task,
  projectId,
  isOverlay = false,
}: {
  task: TaskDTO;
  projectId: string;
  isOverlay?: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const deleteMutation = useDeleteTask(projectId);

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { type: "task", task } });

  const style = isOverlay
    ? undefined
    : { transform: CSS.Translate.toString(transform), transition };

  return (
    <>
      <motion.div
        ref={setNodeRef}
        style={style}
        layout={!isOverlay}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className={cn(
          "group relative overflow-hidden rounded-xl border p-3",
          "bg-card/95 border-border",
          "shadow-sm",
          "transition-all duration-200",
          !isOverlay && !isDragging && "hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30",
          isOverlay && [
            "rotate-[1.5deg]",
            "shadow-2xl",
            "border-primary/20",
            "bg-card",
            "ring-1 ring-primary/10",
            "backdrop-blur-sm",
          ],
          isDragging && !isOverlay && "opacity-30 scale-[0.98]",
        )}
      >
        {/* Priority accent bar */}
        {!isOverlay && (
          <span
            aria-hidden="true"
            className={cn(
              "absolute left-0 inset-y-0 w-0.5",
              task.priority === "URGENT" && "bg-red-500",
              task.priority === "HIGH" && "bg-amber-500",
              task.priority === "MEDIUM" && "bg-blue-500/60",
              task.priority === "LOW" && "bg-transparent",
            )}
          />
        )}

        <div className={cn("flex items-start gap-2", task.priority !== "LOW" && !isOverlay && "pl-1.5")}>
          {/* Drag handle */}
          <button
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder task"
            className="text-muted-foreground/30 hover:text-muted-foreground mt-0.5 cursor-grab touch-none active:cursor-grabbing transition-colors"
          >
            <GripVertical className="size-4" aria-hidden="true" />
          </button>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-medium leading-snug break-words">{task.title}</h4>
            {task.description && (
              <p className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-relaxed">
                {task.description}
              </p>
            )}
            <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
              <PriorityBadge priority={task.priority} />
              <DueDateDisplay dueDate={task.dueDate} />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-1">
            <button
              type="button"
              aria-label={`Edit task: ${task.title}`}
              onClick={() => setEditOpen(true)}
              className="touch-manipulation p-1 rounded-md text-muted-foreground/40 opacity-100 transition-all hover:text-foreground hover:bg-muted/60 sm:p-0.5 sm:opacity-0 sm:group-hover:opacity-100"
            >
              <Pencil className="size-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={`Delete task: ${task.title}`}
              onClick={() => setDeleteOpen(true)}
              disabled={deleteMutation.isPending}
              className="touch-manipulation p-1 rounded-md text-muted-foreground/40 opacity-100 transition-all hover:text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed sm:p-0.5 sm:opacity-0 sm:group-hover:opacity-100"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </motion.div>

      <EditTaskDialog
        task={task}
        projectId={projectId}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete task?"
        description={
          <>
            Delete <span className="text-foreground font-medium">{task.title}</span>? This action
            can be reversed by an admin.
          </>
        }
        confirmLabel="Delete task"
        onConfirm={() => {
          deleteMutation.mutate(task.id);
          setDeleteOpen(false);
        }}
        isLoading={deleteMutation.isPending}
      />
    </>
  );
}

