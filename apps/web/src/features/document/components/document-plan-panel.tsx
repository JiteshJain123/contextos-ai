"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  Sparkles,
  CheckSquare,
  Flag,
  Layers,
  Calendar,
  Clock,
  Plus,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Tag,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import type {
  DocumentPlanTask,
  DocumentPlanMilestone,
  DocumentPlanPhase,
} from "@contextos-ai/validators/document";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { queryKeys } from "@/lib/query-keys";
import { taskApi } from "@/features/task";
import { calendarApi } from "@/features/calendar";
import type { PlanGenerationState } from "../hooks/use-generate-plan";

// ── Helpers ───────────────────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400",
  MEDIUM: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400",
  LOW: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

const CATEGORY_COLORS: Record<string, string> = {
  setup: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  design: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400",
  frontend: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400",
  backend: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400",
  testing: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  deployment: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400",
  documentation: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium uppercase shrink-0", PRIORITY_COLORS[priority] ?? PRIORITY_COLORS.MEDIUM)}>
      {priority}
    </span>
  );
}

function CategoryBadge({ category }: { category?: string }) {
  if (!category) return null;
  return (
    <span className={cn("flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium", CATEGORY_COLORS[category] ?? "bg-muted text-muted-foreground")}>
      <Tag className="size-2.5" />
      {category}
    </span>
  );
}

function EffortBadge({ effort }: { effort?: string }) {
  if (!effort) return null;
  return (
    <span className="flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground shrink-0">
      <Clock className="size-2.5" />
      {effort}
    </span>
  );
}

// ── Collapsible section ───────────────────────────────────────────────────────

function Section({
  title,
  icon: Icon,
  count,
  accent,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ElementType;
  count?: number;
  accent: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        <div className={cn("flex size-6 items-center justify-center rounded-md", accent)}>
          <Icon className="size-3.5" />
        </div>
        <span className="flex-1 text-sm font-semibold">{title}</span>
        {count !== undefined && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{count}</span>
        )}
        {open ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-4 py-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Generating skeleton ───────────────────────────────────────────────────────

function GeneratingSkeleton({ message }: { message: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
        <Loader2 className="size-4 animate-spin text-primary shrink-0" />
        <div>
          <p className="text-sm font-medium text-primary">{message}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            AI is analysing requirements, deadlines, and risks to build a tailored plan…
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {[80, 60, 90, 50, 70].map((w, i) => (
          <div
            key={i}
            className="h-12 animate-pulse rounded-lg bg-muted"
            style={{ width: `${w}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Task rows with selection ──────────────────────────────────────────────────

interface TaskListProps {
  tasks: DocumentPlanTask[];
  selected: Set<number>;
  onToggle: (i: number) => void;
  onToggleAll: () => void;
}

function TaskList({ tasks, selected, onToggle, onToggleAll }: TaskListProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onToggleAll}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <CheckSquare className="size-3.5" />
          {selected.size === tasks.length ? "Deselect all" : "Select all"}
        </button>
        <span className="text-[11px] text-muted-foreground">
          {selected.size}/{tasks.length} selected
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        {tasks.map((task, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onToggle(i)}
            className={cn(
              "flex items-start gap-2.5 rounded-lg border px-3 py-2 text-left transition-all",
              selected.has(i)
                ? "border-primary/40 bg-primary/5"
                : "border-border hover:bg-muted/20",
            )}
          >
            <div
              className={cn(
                "mt-0.5 flex size-3.5 shrink-0 items-center justify-center rounded border transition-colors",
                selected.has(i) ? "border-primary bg-primary" : "border-muted-foreground/30",
              )}
            >
              {selected.has(i) && (
                <svg viewBox="0 0 8 8" className="size-2.5 text-primary-foreground">
                  <polyline points="1,4 3,6 7,2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-medium">{task.title}</span>
                <PriorityBadge priority={task.priority} />
                <CategoryBadge category={task.category} />
                <EffortBadge effort={task.estimatedEffort} />
              </div>
              {task.description && (
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{task.description}</p>
              )}
              {(task.startDate || task.dueDate) && (
                <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Calendar className="size-3" />
                  {task.startDate && `Start: ${task.startDate}`}
                  {task.startDate && task.dueDate && " · "}
                  {task.dueDate && `Due: ${task.dueDate}`}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Milestones list ───────────────────────────────────────────────────────────

interface MilestonesListProps {
  milestones: DocumentPlanMilestone[];
  selectedMilestones: Set<number>;
  onToggle: (i: number) => void;
  onToggleAll: () => void;
}

function MilestonesList({ milestones, selectedMilestones, onToggle, onToggleAll }: MilestonesListProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onToggleAll}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <CheckSquare className="size-3.5" />
          {selectedMilestones.size === milestones.length ? "Deselect all" : "Select all"}
        </button>
        <span className="text-[11px] text-muted-foreground">
          {selectedMilestones.size}/{milestones.length} selected
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        {milestones.map((m, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onToggle(i)}
            className={cn(
              "flex items-start gap-2.5 rounded-lg border px-3 py-2 text-left transition-all",
              selectedMilestones.has(i)
                ? "border-amber-400/40 bg-amber-50/50 dark:bg-amber-950/10"
                : "border-border hover:bg-muted/20",
            )}
          >
            <div
              className={cn(
                "mt-0.5 flex size-3.5 shrink-0 items-center justify-center rounded border transition-colors",
                selectedMilestones.has(i)
                  ? "border-amber-500 bg-amber-500"
                  : "border-muted-foreground/30",
              )}
            >
              {selectedMilestones.has(i) && (
                <svg viewBox="0 0 8 8" className="size-2.5 text-white">
                  <polyline points="1,4 3,6 7,2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{m.title}</span>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Calendar className="size-3" />
                  {m.targetDate}
                </span>
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {m.taskIndices.length} task{m.taskIndices.length !== 1 ? "s" : ""}
                </span>
              </div>
              {m.description && (
                <p className="mt-0.5 text-xs text-muted-foreground">{m.description}</p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Phase timeline ────────────────────────────────────────────────────────────

function PhaseTimeline({ phases, tasks }: { phases: DocumentPlanPhase[]; tasks: DocumentPlanTask[] }) {
  const colors = [
    "bg-blue-500",
    "bg-violet-500",
    "bg-emerald-500",
    "bg-amber-500",
  ];

  return (
    <div className="flex flex-col gap-2">
      {phases.map((phase, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", colors[i % colors.length])} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">{phase.name}</span>
              {(phase.startDate || phase.endDate) && (
                <span className="text-[10px] text-muted-foreground">
                  {phase.startDate && phase.endDate
                    ? `${phase.startDate} → ${phase.endDate}`
                    : phase.startDate ?? phase.endDate}
                </span>
              )}
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {phase.taskIndices.length} task{phase.taskIndices.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {phase.taskIndices.slice(0, 4).map((idx) => {
                const t = tasks[idx];
                return t ? (
                  <span key={idx} className="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {t.title.slice(0, 35)}{t.title.length > 35 ? "…" : ""}
                  </span>
                ) : null;
              })}
              {phase.taskIndices.length > 4 && (
                <span className="text-[10px] text-muted-foreground">
                  +{phase.taskIndices.length - 4} more
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

interface DocumentPlanPanelProps {
  projectId: string;
  planState: PlanGenerationState;
  onRegenerate: () => void;
  onDismiss: () => void;
}

export function DocumentPlanPanel({
  projectId,
  planState,
  onRegenerate,
  onDismiss,
}: DocumentPlanPanelProps) {
  const queryClient = useQueryClient();

  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [selectedMilestones, setSelectedMilestones] = useState<Set<number>>(new Set());
  const [isCreatingTasks, setIsCreatingTasks] = useState(false);
  const [isCreatingMilestones, setIsCreatingMilestones] = useState(false);

  const plan = planState.status === "ready" ? planState.plan : null;

  // Auto-select all tasks and milestones when a new plan arrives
  useEffect(() => {
    if (!plan) return;
    setSelectedTasks(new Set(plan.tasks.map((_, i) => i)));
    setSelectedMilestones(new Set(plan.milestones.map((_, i) => i)));
  }, [plan]);

  // ── Generating state ───────────────────────────────────────────────────────

  if (planState.status === "generating") {
    return <GeneratingSkeleton message={planState.message} />;
  }

  // ── Error state ────────────────────────────────────────────────────────────

  if (planState.status === "error") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-6 text-center">
        <AlertCircle className="size-8 text-destructive" />
        <div>
          <p className="text-sm font-semibold">Plan generation failed</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{planState.message}</p>
        </div>
        <Button size="sm" variant="outline" onClick={onRegenerate} className="gap-1.5 text-xs">
          <RefreshCw className="size-3.5" />
          Retry
        </Button>
      </div>
    );
  }

  // ── Idle (no plan yet) — shouldn't normally render ─────────────────────────

  if (planState.status === "idle" || !plan) {
    return null;
  }

  // ── Create tasks handler ───────────────────────────────────────────────────

  const handleCreateTasks = async () => {
    if (selectedTasks.size === 0) {
      toast.error("Select at least one task");
      return;
    }
    setIsCreatingTasks(true);
    try {
      const items = Array.from(selectedTasks)
        .sort((a, b) => a - b)
        .map((i) => {
          const t = plan.tasks[i]!;
          return {
            title: t.title.slice(0, 200),
            description: t.description?.slice(0, 5000),
            priority: (["LOW", "MEDIUM", "HIGH", "URGENT"] as const).includes(t.priority as never)
              ? (t.priority as "LOW" | "MEDIUM" | "HIGH" | "URGENT")
              : ("MEDIUM" as const),
            status: "TODO" as const,
            dueDate: t.dueDate ? new Date(t.dueDate) : undefined,
            startDate: t.startDate ? new Date(t.startDate) : undefined,
          };
        });

      const created = await taskApi.createBatch(projectId, items);

      void queryClient.invalidateQueries({ queryKey: queryKeys.task.byProject(projectId) });
      toast.success(`${created.length} task${created.length === 1 ? "" : "s"} added to board`);
      setSelectedTasks(new Set());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create tasks");
    } finally {
      setIsCreatingTasks(false);
    }
  };

  // ── Create milestones handler ──────────────────────────────────────────────

  const handleCreateMilestones = async () => {
    if (selectedMilestones.size === 0) {
      toast.error("Select at least one milestone");
      return;
    }
    setIsCreatingMilestones(true);
    try {
      const items = Array.from(selectedMilestones)
        .sort((a, b) => a - b)
        .map((i) => plan.milestones[i]!);

      await Promise.all(
        items.map((m) =>
          calendarApi.createMilestone(projectId, {
            title: m.title,
            description: m.description,
            targetDate: new Date(m.targetDate),
          }),
        ),
      );

      void queryClient.invalidateQueries({ queryKey: queryKeys.milestone.byProject(projectId) });
      toast.success(`${items.length} milestone${items.length === 1 ? "" : "s"} created`);
      setSelectedMilestones(new Set());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create milestones");
    } finally {
      setIsCreatingMilestones(false);
    }
  };

  const toggleTask = (i: number) => {
    setSelectedTasks((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const toggleAllTasks = () => {
    setSelectedTasks(
      selectedTasks.size === plan.tasks.length ? new Set() : new Set(plan.tasks.map((_, i) => i)),
    );
  };

  const toggleMilestone = (i: number) => {
    setSelectedMilestones((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const toggleAllMilestones = () => {
    setSelectedMilestones(
      selectedMilestones.size === plan.milestones.length
        ? new Set()
        : new Set(plan.milestones.map((_, i) => i)),
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <h3 className="text-sm font-semibold">AI Generated Plan</h3>
          {plan.totalEstimatedDays && (
            <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              <Clock className="size-3" />
              ~{plan.totalEstimatedDays}d total
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onRegenerate}
            className="h-7 gap-1 text-xs text-muted-foreground"
          >
            <RefreshCw className="size-3" />
            Regenerate
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-7 text-xs text-muted-foreground"
          >
            Dismiss
          </Button>
        </div>
      </div>

      {/* Plan summary */}
      {plan.summary && (
        <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground leading-relaxed">
          {plan.summary}
        </p>
      )}

      {/* Tasks */}
      {plan.tasks.length > 0 && (
        <Section
          title="Tasks"
          icon={CheckSquare}
          count={plan.tasks.length}
          accent="bg-green-500/10 text-green-600"
        >
          <div className="flex flex-col gap-3">
            <TaskList
              tasks={plan.tasks}
              selected={selectedTasks}
              onToggle={toggleTask}
              onToggleAll={toggleAllTasks}
            />
            <Button
              size="sm"
              onClick={handleCreateTasks}
              disabled={selectedTasks.size === 0 || isCreatingTasks}
              className="w-full gap-1.5 text-sm"
            >
              {isCreatingTasks ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Plus className="size-3.5" />
              )}
              {isCreatingTasks
                ? "Adding to board…"
                : `Add ${selectedTasks.size > 0 ? selectedTasks.size : ""} task${selectedTasks.size === 1 ? "" : "s"} to board`}
            </Button>
          </div>
        </Section>
      )}

      {/* Milestones */}
      {plan.milestones.length > 0 && (
        <Section
          title="Milestones"
          icon={Flag}
          count={plan.milestones.length}
          accent="bg-amber-500/10 text-amber-600"
        >
          <div className="flex flex-col gap-3">
            <MilestonesList
              milestones={plan.milestones}
              selectedMilestones={selectedMilestones}
              onToggle={toggleMilestone}
              onToggleAll={toggleAllMilestones}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleCreateMilestones}
              disabled={selectedMilestones.size === 0 || isCreatingMilestones}
              className="w-full gap-1.5 text-sm"
            >
              {isCreatingMilestones ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Flag className="size-3.5 text-amber-500" />
              )}
              {isCreatingMilestones
                ? "Creating milestones…"
                : `Create ${selectedMilestones.size > 0 ? selectedMilestones.size : ""} milestone${selectedMilestones.size === 1 ? "" : "s"}`}
            </Button>
          </div>
        </Section>
      )}

      {/* Phases / Timeline */}
      {plan.phases.length > 0 && (
        <Section
          title="Timeline Phases"
          icon={Layers}
          count={plan.phases.length}
          accent="bg-blue-500/10 text-blue-600"
          defaultOpen={false}
        >
          <PhaseTimeline phases={plan.phases} tasks={plan.tasks} />
        </Section>
      )}
    </div>
  );
}
