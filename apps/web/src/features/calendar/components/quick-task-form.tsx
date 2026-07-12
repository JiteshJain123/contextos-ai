"use client";

import { useForm } from "react-hook-form";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { Button } from "@/components/ui/button";
import { taskApi } from "@/features/task/api/task.api";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";

// ── Form shape (string dates for native inputs) ───────────────────────────────

interface QuickTaskFormValues {
  title: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate: string;
  startDate: string;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface QuickTaskFormProps {
  projectId: string;
  initialDate?: Date | null;
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function QuickTaskForm({ projectId, initialDate, onClose }: QuickTaskFormProps) {
  const queryClient = useQueryClient();

  const defaultDueDate = initialDate
    ? initialDate.toISOString().split("T")[0] ?? ""
    : "";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<QuickTaskFormValues>({
    defaultValues: {
      priority: "MEDIUM",
      dueDate: defaultDueDate,
    },
  });

  const onSubmit = async (data: QuickTaskFormValues) => {
    try {
      await taskApi.create(projectId, {
        title: data.title,
        status: "TODO",
        priority: data.priority,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.task.byProject(projectId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.calendar.byProject(projectId) }),
      ]);
      toast.success(`Task "${data.title}" created`);
      onClose();
    } catch {
      toast.error("Failed to create task");
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.15 }}
          className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">New Task</h2>
            <button
              type="button"
              onClick={onClose}
              className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-3"
          >
            {/* Title */}
            <div className="flex flex-col gap-1">
              <input
                {...register("title", { required: "Title is required" })}
                placeholder="Task title"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
              />
              {errors.title && (
                <p className="text-xs text-destructive">{errors.title.message}</p>
              )}
            </div>

            {/* Due date + priority row */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label htmlFor="qtf-due-date" className="text-xs text-muted-foreground">Due date</label>
                <input
                  id="qtf-due-date"
                  {...register("dueDate")}
                  type="date"
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary/40"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="qtf-priority" className="text-xs text-muted-foreground">Priority</label>
                <select
                  id="qtf-priority"
                  {...register("priority")}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary/40"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>

            {/* Start date */}
            <div className="flex flex-col gap-1">
              <label htmlFor="qtf-start-date" className="text-xs text-muted-foreground">Start date (optional)</label>
              <input
                id="qtf-start-date"
                {...register("startDate")}
                type="date"
                className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary/40"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button
                type="submit"
                size="sm"
                className="flex-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating…" : "Create Task"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
              >
                Cancel
              </Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
