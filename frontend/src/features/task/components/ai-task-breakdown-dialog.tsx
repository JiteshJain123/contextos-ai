"use client";

import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  GitBranch,
  Lightbulb,
  Link2,
  ListChecks,
  Loader2,
  Square,
  Trash2,
  UserRound,
  Wand2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { TaskPriority, TaskStatus } from "@/lib/validators/task";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import { queryKeys } from "@/lib/query-keys";

import { taskApi } from "../api/task.api";
import { type BreakdownTask, type TaskMeta, useTaskBreakdown } from "../hooks/use-task-breakdown";
import { statusMeta } from "../lib/status";

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_OPTIONS: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const STATUS_OPTIONS: TaskStatus[] = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"];

const PRIORITY_BADGE_CLASS: Record<TaskPriority, string> = {
  LOW: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  MEDIUM: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  URGENT: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

const PRIORITY_DOT: Record<TaskPriority, string> = {
  LOW: "bg-slate-400",
  MEDIUM: "bg-blue-500",
  HIGH: "bg-orange-500",
  URGENT: "bg-red-500",
};

const ASSIGNEE_ROLE_CLASS: Record<string, string> = {
  "Frontend Dev": "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  "Backend Dev": "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  "Full-Stack Dev": "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  DevOps: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  Designer: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  "QA Engineer": "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

const EXAMPLE_GOALS = [
  "Build a user authentication system with email and Google OAuth",
  "Set up CI/CD pipeline for automated testing and deployment",
  "Design and implement a responsive landing page",
  "Migrate database from v1 schema to v2 with zero downtime",
];

const SPRINT_CAPACITY_HOURS = 40;

const EMPTY_META: TaskMeta = { isCriticalPath: false, isDuplicate: false, isDepBlocked: false, resolvedDeps: [] };

// ─── TaskCard ─────────────────────────────────────────────────────────────────

function TaskCard({
  task,
  meta,
  onToggle,
  onUpdate,
  onRemove,
}: {
  task: BreakdownTask;
  meta: TaskMeta;
  onToggle: () => void;
  onUpdate: (updates: Partial<Omit<BreakdownTask, "id">>) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const roleClass = task.assigneeRole
    ? (ASSIGNEE_ROLE_CLASS[task.assigneeRole] ?? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300")
    : null;

  return (
    <div
      className={cn(
        "group rounded-xl border transition-all duration-200",
        task.selected
          ? "border-primary/25 bg-primary/5 dark:border-primary/20 dark:bg-primary/8"
          : "border-border bg-muted/20",
      )}
    >
      {/* Main row */}
      <div className="flex items-start gap-3 p-3">
        {/* Checkbox */}
        <button
          type="button"
          onClick={onToggle}
          className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-primary"
          aria-label={task.selected ? "Deselect task" : "Select task"}
        >
          {task.selected ? (
            <CheckSquare className="size-4 text-primary" />
          ) : (
            <Square className="size-4" />
          )}
        </button>

        {/* Content */}
        <div className="min-w-0 flex-1 space-y-1.5">
          {/* Title — inline edit */}
          <Input
            value={task.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            className="h-auto border-0 bg-transparent p-0 text-sm font-medium shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            placeholder="Task title"
          />

          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Priority */}
            <span
              className={cn(
                "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                PRIORITY_BADGE_CLASS[task.priority],
              )}
            >
              <span className={cn("size-1.5 rounded-full", PRIORITY_DOT[task.priority])} />
              {task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}
            </span>

            {/* Status */}
            <span className="flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
              <span className={cn("size-1.5 rounded-full", statusMeta[task.status].dot)} />
              {statusMeta[task.status].label}
            </span>

            {/* Estimated hours chip */}
            {task.estimatedHours != null && (
              <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                <Clock className="size-3" />
                {task.estimatedHours}h
              </span>
            )}

            {/* Assignee role */}
            {task.assigneeRole && roleClass && (
              <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", roleClass)}>
                <UserRound className="size-3" />
                {task.assigneeRole}
              </span>
            )}

            {/* Dependencies + block state */}
            {(task.dependencies?.length ?? 0) > 0 && (
              <span
                className={cn(
                  "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                  meta.isDepBlocked
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {meta.isDepBlocked ? <AlertTriangle className="size-3" /> : <Link2 className="size-3" />}
                {task.dependencies!.length === 1 ? "1 dep" : `${task.dependencies!.length} deps`}
                {meta.isDepBlocked && " · blocked"}
              </span>
            )}

            {/* Critical path badge */}
            {meta.isCriticalPath && (
              <span className="flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-medium text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                <GitBranch className="size-3" />
                critical path
              </span>
            )}

            {/* Duplicate warning */}
            {meta.isDuplicate && (
              <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
                <AlertTriangle className="size-3" />
                duplicate
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded p-1 text-muted-foreground/50 transition-colors hover:bg-muted hover:text-muted-foreground"
            aria-label={expanded ? "Collapse" : "Edit details"}
          >
            {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded p-1 text-muted-foreground/50 transition-colors hover:bg-destructive/10 hover:text-destructive"
            aria-label="Remove task"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded edit panel */}
      {expanded && (
        <div className="border-t border-border/60 px-3 pb-3 pt-2.5 space-y-3">
          {/* Description */}
          <div>
            <label
              htmlFor={`desc-${task.id}`}
              className="mb-1 block text-[11px] font-medium text-muted-foreground"
            >
              Description
            </label>
            <Textarea
              id={`desc-${task.id}`}
              value={task.description ?? ""}
              onChange={(e) => onUpdate({ description: e.target.value || undefined })}
              placeholder="Optional — add context or details"
              rows={2}
              className="resize-none text-sm"
            />
          </div>

          {/* Acceptance Criteria */}
          {task.acceptanceCriteria && task.acceptanceCriteria.length > 0 && (
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <ListChecks className="size-3.5" />
                Acceptance Criteria
              </div>
              <ul className="space-y-1.5 rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
                {task.acceptanceCriteria.map((criterion, i) => (
                  <li key={i} className="flex items-start gap-2 text-[11px] text-foreground/80">
                    <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-green-500" />
                    <span>{criterion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Implementation Notes */}
          {task.implementationNotes && (
            <div>
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <Lightbulb className="size-3.5 text-amber-500" />
                Implementation Notes
              </div>
              <p className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-[11px] leading-relaxed text-foreground/70">
                {task.implementationNotes}
              </p>
            </div>
          )}

          {/* Dependencies — resolved against batch */}
          {meta.resolvedDeps.length > 0 && (
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <Link2 className="size-3.5" />
                Depends On
              </div>
              <div className="flex flex-wrap gap-1">
                {meta.resolvedDeps.map((dep, i) => (
                  <span
                    key={i}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px]",
                      dep.inBatch && dep.isSelected
                        ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800/40 dark:bg-green-900/20 dark:text-green-300"
                        : dep.inBatch
                          ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300"
                          : "border-border bg-muted/40 text-muted-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "size-1.5 shrink-0 rounded-full",
                        dep.inBatch && dep.isSelected
                          ? "bg-green-500"
                          : dep.inBatch
                            ? "bg-amber-500"
                            : "bg-slate-400",
                      )}
                    />
                    {dep.title}
                  </span>
                ))}
              </div>
              <p className="mt-1.5 text-[10px] text-muted-foreground/50">
                Green = selected · Amber = unselected dependency · Gray = external
              </p>
            </div>
          )}

          {/* Priority + Status selects */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label
                htmlFor={`priority-${task.id}`}
                className="mb-1 block text-[11px] font-medium text-muted-foreground"
              >
                Priority
              </label>
              <Select
                value={task.priority}
                onValueChange={(v) => onUpdate({ priority: v as TaskPriority })}
              >
                <SelectTrigger id={`priority-${task.id}`} className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p} className="text-xs">
                      <span className="flex items-center gap-1.5">
                        <span className={cn("size-2 rounded-full", PRIORITY_DOT[p])} />
                        {p.charAt(0) + p.slice(1).toLowerCase()}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label
                htmlFor={`status-${task.id}`}
                className="mb-1 block text-[11px] font-medium text-muted-foreground"
              >
                Status
              </label>
              <Select
                value={task.status}
                onValueChange={(v) => onUpdate({ status: v as TaskStatus })}
              >
                <SelectTrigger id={`status-${task.id}`} className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">
                      <span className="flex items-center gap-1.5">
                        <span className={cn("size-2 rounded-full", statusMeta[s].dot)} />
                        {statusMeta[s].label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── WeekSection ──────────────────────────────────────────────────────────────

function WeekSection({
  week,
  tasks,
  sprintLoad,
  onToggle,
  onUpdate,
  onRemove,
  getTaskMeta,
}: {
  week: number;
  tasks: BreakdownTask[];
  sprintLoad: number;
  onToggle: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Omit<BreakdownTask, "id">>) => void;
  onRemove: (id: string) => void;
  getTaskMeta: (id: string) => TaskMeta;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const totalHours = tasks.reduce((sum, t) => sum + (t.estimatedHours ?? 0), 0);
  const selectedCount = tasks.filter((t) => t.selected).length;
  const isOverloaded = sprintLoad > SPRINT_CAPACITY_HOURS;
  const capacityPct = Math.min(100, (sprintLoad / SPRINT_CAPACITY_HOURS) * 100);

  return (
    <div className="overflow-hidden rounded-xl border border-border/60">
      {/* Sprint header */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full items-center gap-2 bg-muted/40 px-3 py-2 text-left transition-colors hover:bg-muted/60"
      >
        <CalendarDays className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="text-xs font-semibold text-foreground">
          {week === 0 ? "General Tasks" : `Sprint ${week}`}
        </span>
        <span className="text-[11px] text-muted-foreground">
          · {tasks.length} task{tasks.length !== 1 ? "s" : ""}
          {totalHours > 0 && ` · ${totalHours}h`}
          {selectedCount > 0 && selectedCount < tasks.length && (
            <span className="text-primary"> · {selectedCount} selected</span>
          )}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          {sprintLoad > 0 && (
            <span
              className={cn(
                "text-[10px] font-medium",
                isOverloaded
                  ? "text-red-600 dark:text-red-400"
                  : sprintLoad > SPRINT_CAPACITY_HOURS * 0.75
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-green-600 dark:text-green-400",
              )}
            >
              {isOverloaded ? "⚠ " : ""}{sprintLoad}h / {SPRINT_CAPACITY_HOURS}h
            </span>
          )}
          <span className="text-muted-foreground/60">
            {collapsed ? (
              <ChevronRight className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
          </span>
        </div>
      </button>

      {/* Sprint capacity bar */}
      {sprintLoad > 0 && (
        <div className="h-0.5 w-full bg-muted/60">
          <div
            className={cn(
              "h-full transition-all duration-500",
              isOverloaded
                ? "bg-red-500"
                : sprintLoad > SPRINT_CAPACITY_HOURS * 0.75
                  ? "bg-amber-500"
                  : "bg-green-500",
            )}
            style={{ width: `${capacityPct}%` }}
          />
        </div>
      )}

      {/* Task list */}
      {!collapsed && (
        <div className="flex flex-col gap-2 p-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="animate-in fade-in slide-in-from-bottom-1 duration-200"
            >
              <TaskCard
                task={task}
                meta={getTaskMeta(task.id)}
                onToggle={() => onToggle(task.id)}
                onUpdate={(updates) => onUpdate(task.id, updates)}
                onRemove={() => onRemove(task.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Streaming indicator ──────────────────────────────────────────────────────

function StreamingDot() {
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <span className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 animate-pulse rounded-full bg-primary/60"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </span>
      Generating tasks…
    </span>
  );
}

// ─── Main dialog ──────────────────────────────────────────────────────────────

export function AiTaskBreakdownDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [goal, setGoal] = useState("");
  const [creating, setCreating] = useState(false);
  const [goalPlaceholder] = useState(
    () => EXAMPLE_GOALS[Math.floor(Math.random() * EXAMPLE_GOALS.length)] ?? EXAMPLE_GOALS[0],
  );

  const queryClient = useQueryClient();
  const {
    tasks,
    selectedTasks,
    phase,
    error,
    generate,
    reset,
    updateTask,
    removeTask,
    toggleTask,
    toggleAll,
    taskMeta,
    sprintLoads,
    dependencyConflicts,
  } = useTaskBreakdown(projectId);

  const getTaskMeta = (id: string): TaskMeta => taskMeta.get(id) ?? EMPTY_META;

  // Group tasks by sprint — prefer sprintOrder (1–4) over legacy week (1–2)
  const tasksByWeek = useMemo(() => {
    const hasSprintInfo = tasks.some((t) => t.sprintOrder != null || t.week != null);
    if (!hasSprintInfo) return null;
    const weekMap = new Map<number, BreakdownTask[]>();
    for (const task of tasks) {
      const w = task.sprintOrder ?? task.week ?? 1;
      const list = weekMap.get(w) ?? [];
      list.push(task);
      weekMap.set(w, list);
    }
    return Array.from(weekMap.entries()).sort(([a], [b]) => a - b);
  }, [tasks]);

  const totalSelectedHours = selectedTasks.reduce((sum, t) => sum + (t.estimatedHours ?? 0), 0);

  function handleOpenChange(val: boolean) {
    setOpen(val);
    if (!val) {
      setGoal("");
      reset();
    }
  }

  async function handleGenerate() {
    if (!goal.trim() || phase === "generating") return;
    await generate(goal.trim());
  }

  async function handleCreate() {
    if (!selectedTasks.length || creating) return;
    setCreating(true);
    try {
      await taskApi.createBatch(
        projectId,
        selectedTasks.map((t) => ({
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
        })),
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.task.byProject(projectId) });
      toast.success(
        `${selectedTasks.length} task${selectedTasks.length === 1 ? "" : "s"} added to your board`,
      );
      handleOpenChange(false);
    } catch {
      toast.error("Couldn't create tasks. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  const isInputPhase = phase === "idle";
  const allSelected = tasks.length > 0 && tasks.every((t) => t.selected);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="gap-1.5">
          <Wand2 className="size-3.5" aria-hidden="true" />
          Generate Tasks with AI
        </Button>
      </DialogTrigger>

      <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-xl">
        {/* Header */}
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle className="flex items-center gap-2.5 text-base">
            <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm">
              <Wand2 className="size-4 text-white" aria-hidden="true" />
            </span>
            Generate Tasks with AI
          </DialogTitle>
        </DialogHeader>

        {/* Body */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {isInputPhase ? (
            // ── Input phase ────────────────────────────────────────────────────
            <div className="flex flex-col gap-4 p-5">
              <p className="text-sm text-muted-foreground">
                Describe a high-level goal and AI will break it into specific, actionable tasks
                with priorities, time estimates, sprint weeks, and acceptance criteria.
              </p>

              <Textarea
                placeholder={goalPlaceholder}
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                rows={4}
                className="resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void handleGenerate();
                }}
              />

              <p className="text-[11px] text-muted-foreground/60">Press ⌘ Enter to generate</p>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => handleOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => void handleGenerate()}
                  disabled={!goal.trim()}
                  className="gap-1.5"
                >
                  <Wand2 className="size-4" aria-hidden="true" />
                  Generate Tasks
                </Button>
              </div>
            </div>
          ) : (
            // ── Generating / Review phase ──────────────────────────────────────
            <>
              {/* Goal summary strip */}
              <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/30 px-5 py-2.5">
                <p className="line-clamp-1 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Goal:</span> {goal}
                </p>
                <button
                  type="button"
                  onClick={() => reset()}
                  className="shrink-0 text-xs text-muted-foreground underline-offset-2 hover:underline"
                >
                  ← New goal
                </button>
              </div>

              {/* Task list */}
              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="flex flex-col gap-2 p-4">
                  {tasksByWeek ? (
                    // Grouped by sprint week
                    tasksByWeek.map(([week, weekTasks]) => (
                      <div
                        key={week}
                        className="animate-in fade-in duration-200"
                      >
                        <WeekSection
                          week={week}
                          tasks={weekTasks}
                          sprintLoad={sprintLoads.get(week) ?? 0}
                          onToggle={toggleTask}
                          onUpdate={updateTask}
                          onRemove={removeTask}
                          getTaskMeta={getTaskMeta}
                        />
                      </div>
                    ))
                  ) : (
                    // Flat list (no sprint data)
                    tasks.map((task) => (
                      <div
                        key={task.id}
                        className="animate-in fade-in slide-in-from-bottom-1 duration-200"
                      >
                        <TaskCard
                          task={task}
                          meta={getTaskMeta(task.id)}
                          onToggle={() => toggleTask(task.id)}
                          onUpdate={(updates) => updateTask(task.id, updates)}
                          onRemove={() => removeTask(task.id)}
                        />
                      </div>
                    ))
                  )}

                  {/* Streaming indicator */}
                  {phase === "generating" && (
                    <div className="flex items-center justify-center py-2">
                      <StreamingDot />
                    </div>
                  )}

                  {/* Error state */}
                  {phase === "error" && error && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  {/* Empty done state */}
                  {phase === "done" && tasks.length === 0 && (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      No tasks were generated. Try rephrasing your goal.
                    </div>
                  )}
                </div>
              </div>

              {/* Footer action bar */}
              {(tasks.length > 0 || phase === "done") && (
                <div className="flex flex-col gap-2 border-t border-border bg-background/95 px-5 py-3.5">
                  {/* Dependency conflict warning */}
                  {dependencyConflicts.length > 0 && (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
                      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                      <span>
                        <strong>{dependencyConflicts.length}</strong>{" "}
                        selected task{dependencyConflicts.length > 1 ? "s have" : " has"} unselected
                        dependencies — select them too or they may be blocked on import.
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={toggleAll}
                        className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {allSelected ? "Deselect all" : "Select all"}
                      </button>
                      <span className="text-xs text-muted-foreground/60">
                        {selectedTasks.length} of {tasks.length} selected
                        {totalSelectedHours > 0 && ` · ~${totalSelectedHours}h`}
                      </span>
                    </div>

                    <Button
                      onClick={() => void handleCreate()}
                      disabled={selectedTasks.length === 0 || creating || phase === "generating"}
                      className="gap-1.5"
                      size="sm"
                    >
                      {creating ? (
                        <>
                          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                          Creating…
                        </>
                      ) : (
                        `Create ${selectedTasks.length} task${selectedTasks.length === 1 ? "" : "s"}`
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
