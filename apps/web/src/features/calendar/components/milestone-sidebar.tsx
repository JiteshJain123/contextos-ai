"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Plus, Trash2, CheckCircle2, Circle, Flag } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import type { MilestoneDTO } from "@contextos-ai/validators/milestone";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

import { useCreateMilestone, useDeleteMilestone, useUpdateMilestone } from "../hooks/use-milestone-mutations";

// ── Form types (string-based for native inputs) ───────────────────────────────

interface MilestoneFormValues {
  title: string;
  targetDate: string;
  description?: string;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface MilestoneSidebarProps {
  projectId: string;
  milestones: MilestoneDTO[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MilestoneSidebar({ projectId, milestones }: MilestoneSidebarProps) {
  const [showForm, setShowForm] = useState(false);

  const createMutation = useCreateMilestone(projectId);
  const updateMutation = useUpdateMilestone(projectId);
  const deleteMutation = useDeleteMilestone(projectId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MilestoneFormValues>();

  const onSubmit = async (data: MilestoneFormValues) => {
    if (!data.targetDate) return;
    await createMutation.mutateAsync({
      title: data.title,
      description: data.description || undefined,
      targetDate: new Date(data.targetDate),
    });
    reset();
    setShowForm(false);
  };

  const toggleComplete = (m: MilestoneDTO) => {
    void updateMutation.mutate({
      milestoneId: m.id,
      input: { completed: !m.completed },
    });
  };

  const sorted = [...milestones].sort(
    (a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime(),
  );

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Flag className="size-4 text-violet-500 shrink-0" />
        <h3 className="text-sm font-semibold">Milestones</h3>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="ml-auto flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
        >
          <Plus className="size-3.5" />
        </button>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-2 overflow-hidden"
          >
            <input
              {...register("title", { required: "Title is required" })}
              placeholder="Milestone title"
              className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
            <input
              {...register("targetDate", { required: true })}
              type="date"
              className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
            />
            {errors.targetDate && (
              <p className="text-xs text-destructive">Target date is required</p>
            )}
            <div className="flex gap-2">
              <Button
                type="submit"
                size="sm"
                className="flex-1 h-7 text-xs"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Saving…" : "Add"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setShowForm(false);
                  reset();
                }}
              >
                Cancel
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Milestone list */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-5 text-center">
          <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
            <Flag className="size-4 text-muted-foreground/50" />
          </div>
          <p className="text-xs text-muted-foreground">No milestones yet</p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="text-xs text-primary underline underline-offset-2"
          >
            Add one
          </button>
        </div>
      ) : (
        <ul className="flex flex-col gap-1">
          {sorted.map((m) => {
            const target = new Date(m.targetDate);
            const now = new Date();
            const diffMs = target.getTime() - now.getTime();
            const diffDays = Math.ceil(diffMs / 86_400_000);
            const isOverdue = !m.completed && diffDays < 0;
            const isNear = !m.completed && diffDays >= 0 && diffDays <= 7;

            const dateLabel = m.completed
              ? "Completed"
              : isOverdue
                ? `${Math.abs(diffDays)}d overdue`
                : diffDays === 0
                  ? "Due today"
                  : diffDays === 1
                    ? "Due tomorrow"
                    : isNear
                      ? `In ${diffDays} days`
                      : target.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

            return (
              <li
                key={m.id}
                className={cn(
                  "group flex items-start gap-2 rounded-lg border p-2 transition-all hover:bg-muted/40",
                  isOverdue
                    ? "border-red-200/60 bg-red-50/30 dark:border-red-900/30 dark:bg-red-950/10"
                    : isNear
                      ? "border-amber-200/60 bg-amber-50/20 dark:border-amber-900/30 dark:bg-amber-950/10"
                      : "border-transparent",
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleComplete(m)}
                  className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-violet-500"
                >
                  {m.completed ? (
                    <CheckCircle2 className="size-4 text-violet-500" />
                  ) : (
                    <Circle className="size-4" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-xs font-medium leading-snug",
                      m.completed && "line-through text-muted-foreground",
                    )}
                  >
                    {m.title}
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 text-[10px] font-medium",
                      m.completed
                        ? "text-muted-foreground/50"
                        : isOverdue
                          ? "text-red-500"
                          : isNear
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-muted-foreground",
                    )}
                  >
                    {dateLabel}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void deleteMutation.mutate(m.id)}
                  className="shrink-0 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
