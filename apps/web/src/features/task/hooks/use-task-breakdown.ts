"use client";

import { useCallback, useMemo, useState } from "react";

import type { TaskPriority, TaskStatus, TaskCategory, TaskComplexity } from "@contextos-ai/validators/task";

import { taskApi } from "../api/task.api";

export interface BreakdownTask {
  /** Client-side stable ID for React key + selection tracking. */
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  estimatedEffort?: string;
  estimatedHours?: number;
  assigneeRole?: string;
  week?: number;
  dependencies?: string[];
  acceptanceCriteria?: string[];
  implementationNotes?: string;
  category?: TaskCategory;
  complexity?: TaskComplexity;
  suggestedDueDate?: string;
  sprintOrder?: number;
  /** Whether this task is selected for batch creation. */
  selected: boolean;
}

export type BreakdownPhase = "idle" | "generating" | "done" | "error";

export interface TaskMeta {
  /** This task is depended on by 2+ other tasks — removing it blocks many others. */
  isCriticalPath: boolean;
  /** Another generated task has the same normalized title. */
  isDuplicate: boolean;
  /** This task is selected but at least one in-batch dependency is not selected. */
  isDepBlocked: boolean;
  /** Each dependency string resolved against the generated batch. */
  resolvedDeps: { title: string; inBatch: boolean; isSelected: boolean }[];
}

function normalizeTitle(t: string): string {
  return t.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Manages streaming AI task breakdown state.
 *
 * Tasks arrive one by one via SSE and are auto-selected.
 * Callers can mutate individual tasks (title, description, priority, status)
 * and toggle selection before calling `create`.
 */
export function useTaskBreakdown(projectId: string) {
  const [tasks, setTasks] = useState<BreakdownTask[]>([]);
  const [phase, setPhase] = useState<BreakdownPhase>("idle");
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (goal: string) => {
      if (phase === "generating") return;
      setTasks([]);
      setError(null);
      setPhase("generating");

      try {
        for await (const event of taskApi.breakdown(projectId, goal)) {
          if (event.type === "task") {
            setTasks((prev) => [
              ...prev,
              {
                id: `bd-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                title: event.task.title,
                description: event.task.description,
                priority: event.task.priority,
                status: event.task.status,
                estimatedEffort: event.task.estimatedEffort,
                estimatedHours: event.task.estimatedHours,
                assigneeRole: event.task.assigneeRole,
                week: event.task.week,
                dependencies: event.task.dependencies,
                acceptanceCriteria: event.task.acceptanceCriteria,
                implementationNotes: event.task.implementationNotes,
                category: event.task.category,
                complexity: event.task.complexity,
                suggestedDueDate: event.task.suggestedDueDate,
                sprintOrder: event.task.sprintOrder,
                selected: true,
              },
            ]);
          } else if (event.type === "done") {
            setPhase("done");
          } else if (event.type === "error") {
            setError(event.message);
            setPhase("error");
          }
        }
        // Stream closed without explicit done — treat as done.
        setPhase((p) => (p === "generating" ? "done" : p));
      } catch {
        setError("Connection lost — please try again");
        setPhase("error");
      }
    },
    [phase, projectId],
  );

  const reset = useCallback(() => {
    setTasks([]);
    setError(null);
    setPhase("idle");
  }, []);

  const updateTask = useCallback(
    (id: string, updates: Partial<Omit<BreakdownTask, "id">>) => {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    },
    [],
  );

  const removeTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toggleTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t)),
    );
  }, []);

  const toggleAll = useCallback(() => {
    setTasks((prev) => {
      const allSelected = prev.every((t) => t.selected);
      return prev.map((t) => ({ ...t, selected: !allSelected }));
    });
  }, []);

  const selectedTasks = useMemo(() => tasks.filter((t) => t.selected), [tasks]);

  // ── Dependency intelligence ────────────────────────────────────────────────

  /** normalized title → task id for the current generated batch */
  const allTitleMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of tasks) m.set(normalizeTitle(t.title), t.id);
    return m;
  }, [tasks]);

  const selectedTitleSet = useMemo(
    () => new Set(selectedTasks.map((t) => normalizeTitle(t.title))),
    [selectedTasks],
  );

  /** normalized title → number of tasks that depend on it */
  const dependantCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const task of tasks) {
      for (const dep of task.dependencies ?? []) {
        const key = normalizeTitle(dep);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return counts;
  }, [tasks]);

  /** normalized titles that appear more than once in the batch */
  const duplicateTitles = useMemo(() => {
    const seen = new Map<string, number>();
    for (const t of tasks) {
      const key = normalizeTitle(t.title);
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    return new Set([...seen.entries()].filter(([, v]) => v > 1).map(([k]) => k));
  }, [tasks]);

  /** Per-task intelligence metadata — memoized, updates when tasks or selection changes. */
  const taskMeta = useMemo(() => {
    const meta = new Map<string, TaskMeta>();
    for (const task of tasks) {
      const normTitle = normalizeTitle(task.title);
      const resolvedDeps = (task.dependencies ?? []).map((dep) => {
        const normDep = normalizeTitle(dep);
        return { title: dep, inBatch: allTitleMap.has(normDep), isSelected: selectedTitleSet.has(normDep) };
      });
      meta.set(task.id, {
        isCriticalPath: (dependantCount.get(normTitle) ?? 0) >= 2,
        isDuplicate: duplicateTitles.has(normTitle),
        isDepBlocked: task.selected && resolvedDeps.some((d) => d.inBatch && !d.isSelected),
        resolvedDeps,
      });
    }
    return meta;
  }, [tasks, allTitleMap, selectedTitleSet, dependantCount, duplicateTitles]);

  /** Selected hours per sprint (sprintOrder → week → 1). Used for capacity display. */
  const sprintLoads = useMemo(() => {
    const loads = new Map<number, number>();
    for (const task of selectedTasks) {
      const sprint = task.sprintOrder ?? task.week ?? 1;
      loads.set(sprint, (loads.get(sprint) ?? 0) + (task.estimatedHours ?? 0));
    }
    return loads;
  }, [selectedTasks]);

  /** Selected tasks whose in-batch dependencies are not all selected. */
  const dependencyConflicts = useMemo(
    () => selectedTasks.filter((t) => taskMeta.get(t.id)?.isDepBlocked ?? false),
    [selectedTasks, taskMeta],
  );

  return {
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
  };
}
