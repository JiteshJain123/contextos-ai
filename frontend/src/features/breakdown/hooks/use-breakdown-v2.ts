"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useTaskBreakdown } from "@/features/task/hooks/use-task-breakdown";
import { taskApi } from "@/features/task/api/task.api";
import { sprintOrderToDate } from "../lib/sprint-dates";
import { useSprintConfig } from "./use-sprint-config";

export type BreakdownStep = "goal" | "review" | "confirm";
export type ViewMode = "roadmap" | "graph" | "list";

export const SPRINT_CAPACITY = 40;

const PRIORITY_WEIGHT: Record<string, number> = {
  URGENT: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

export function useBreakdownV2(projectId: string) {
  const breakdown = useTaskBreakdown(projectId);
  const [step, setStep] = useState<BreakdownStep>("goal");
  const [viewMode, setViewMode] = useState<ViewMode>("roadmap");
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const sprintConfig = useSprintConfig();

  // Auto-advance to review when streaming completes
  useEffect(() => {
    if (breakdown.phase === "done" && step === "goal") {
      setStep("review");
    }
  }, [breakdown.phase, step]);

  const goToConfirm = useCallback(() => setStep("confirm"), []);
  const goToReview = useCallback(() => setStep("review"), []);
  const goToGoal = useCallback(() => {
    breakdown.reset();
    setStep("goal");
    setImportError(null);
  }, [breakdown]);

  // Circular dependency detection — DFS (directed cycle) across the dep graph
  const circularDeps = useMemo(() => {
    const cycleIds = new Set<string>();
    const { tasks } = breakdown;
    if (tasks.length === 0) return cycleIds;

    const titleToId = new Map(tasks.map((t) => [t.title.toLowerCase().trim(), t.id]));
    const adj = new Map<string, string[]>();
    for (const t of tasks) {
      adj.set(
        t.id,
        (t.dependencies ?? [])
          .map((dep) => titleToId.get(dep.toLowerCase().trim()))
          .filter((id): id is string => !!id && id !== t.id),
      );
    }

    const color = new Map<string, number>(tasks.map((t) => [t.id, 0])); // 0=white,1=gray,2=black

    function dfs(id: string): boolean {
      color.set(id, 1);
      for (const depId of adj.get(id) ?? []) {
        const c = color.get(depId) ?? 0;
        if (c === 1) {
          cycleIds.add(id);
          cycleIds.add(depId);
          return true;
        }
        if (c === 0 && dfs(depId)) {
          cycleIds.add(id);
          return true;
        }
      }
      color.set(id, 2);
      return false;
    }

    for (const t of tasks) {
      if ((color.get(t.id) ?? 0) === 0) dfs(t.id);
    }
    return cycleIds;
  }, [breakdown.tasks]);

  const depBlockedCount = useMemo(
    () => [...breakdown.taskMeta.values()].filter((m) => m.isDepBlocked).length,
    [breakdown.taskMeta],
  );

  // Sprint ordering conflict: task T depends on something in the same or later sprint as T
  const sprintConflicts = useMemo(() => {
    const conflictIds = new Set<string>();
    const titleToTask = new Map(
      breakdown.tasks.map((t) => [t.title.toLowerCase().trim(), t]),
    );
    for (const task of breakdown.tasks) {
      const taskSprint = task.sprintOrder ?? 1;
      for (const dep of task.dependencies ?? []) {
        const depTask = titleToTask.get(dep.toLowerCase().trim());
        if (depTask) {
          const depSprint = depTask.sprintOrder ?? 1;
          if (depSprint >= taskSprint) {
            conflictIds.add(task.id);
          }
        }
      }
    }
    return conflictIds;
  }, [breakdown.tasks]);

  // AI sprint rebalancing: topological greedy bin-packing
  const rebalanceSprints = useCallback(() => {
    const { tasks } = breakdown;
    if (tasks.length === 0) return;

    const titleToId = new Map(tasks.map((t) => [t.title.toLowerCase().trim(), t.id]));

    // Build dep graph: id → Set<depId>
    const deps = new Map<string, Set<string>>();
    for (const t of tasks) {
      const resolved = new Set<string>();
      for (const dep of t.dependencies ?? []) {
        const depId = titleToId.get(dep.toLowerCase().trim());
        if (depId && depId !== t.id) resolved.add(depId);
      }
      deps.set(t.id, resolved);
    }

    // Reverse adjacency for Kahn's topological sort
    const revAdj = new Map<string, string[]>();
    for (const t of tasks) {
      if (!revAdj.has(t.id)) revAdj.set(t.id, []);
      for (const depId of deps.get(t.id) ?? []) {
        if (!revAdj.has(depId)) revAdj.set(depId, []);
        revAdj.get(depId)!.push(t.id);
      }
    }

    const inDeg = new Map<string, number>(
      tasks.map((t) => [t.id, deps.get(t.id)?.size ?? 0]),
    );

    // Seed queue: zero-in-degree tasks, highest priority first
    const queue = tasks
      .filter((t) => (inDeg.get(t.id) ?? 0) === 0)
      .sort((a, b) => (PRIORITY_WEIGHT[b.priority] ?? 0) - (PRIORITY_WEIGHT[a.priority] ?? 0))
      .map((t) => t.id);

    const topoOrder: string[] = [];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      topoOrder.push(id);
      const nexts = (revAdj.get(id) ?? []).sort(
        (a, b) =>
          (PRIORITY_WEIGHT[tasks.find((t) => t.id === b)?.priority ?? "LOW"] ?? 0) -
          (PRIORITY_WEIGHT[tasks.find((t) => t.id === a)?.priority ?? "LOW"] ?? 0),
      );
      for (const next of nexts) {
        inDeg.set(next, (inDeg.get(next) ?? 1) - 1);
        if ((inDeg.get(next) ?? 0) <= 0 && !visited.has(next)) queue.push(next);
      }
    }
    // Cycle members go last (unresolvable ordering)
    for (const t of tasks) {
      if (!visited.has(t.id)) topoOrder.push(t.id);
    }

    const taskById = new Map(tasks.map((t) => [t.id, t]));
    const sprintHours = [0, 0, 0, 0]; // index = sprint - 1
    const assignment = new Map<string, number>(); // id → sprint 1–4

    for (const id of topoOrder) {
      const task = taskById.get(id);
      if (!task) continue;
      const effort = task.estimatedHours ?? 2;

      // Minimum sprint: must come after all deps' sprints
      let minSprint = 1;
      for (const depId of deps.get(id) ?? []) {
        const depSprint = assignment.get(depId) ?? 1;
        if (depSprint >= minSprint) minSprint = depSprint + 1;
      }
      minSprint = Math.min(minSprint, 4);

      // Assign to earliest sprint with remaining capacity
      let assigned = false;
      for (let s = minSprint; s <= 4; s++) {
        if ((sprintHours[s - 1] ?? 0) + effort <= SPRINT_CAPACITY) {
          assignment.set(id, s);
          sprintHours[s - 1] = (sprintHours[s - 1] ?? 0) + effort;
          assigned = true;
          break;
        }
      }
      if (!assigned) {
        // Overflow: assign to least-loaded sprint ≥ minSprint
        let best = minSprint;
        let minH = Infinity;
        for (let s = minSprint; s <= 4; s++) {
          const h = sprintHours[s - 1] ?? 0;
          if (h < minH) {
            minH = h;
            best = s;
          }
        }
        assignment.set(id, best);
        sprintHours[best - 1] = (sprintHours[best - 1] ?? 0) + effort;
      }
    }

    // Apply updates — React 18 auto-batches these functional setState calls
    for (const task of tasks) {
      const newSprint = assignment.get(task.id);
      if (newSprint !== undefined && newSprint !== (task.sprintOrder ?? 1)) {
        breakdown.updateTask(task.id, { sprintOrder: newSprint });
      }
    }
  }, [breakdown]);

  function buildImportPayload() {
    return breakdown.selectedTasks.map((t) => ({
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      dueDate: t.sprintOrder
        ? new Date(sprintOrderToDate(sprintConfig.sprintStart, t.sprintOrder))
        : t.suggestedDueDate
          ? new Date(t.suggestedDueDate)
          : undefined,
    }));
  }

  const importTasks = useCallback(async () => {
    setIsImporting(true);
    setImportError(null);
    try {
      const payload = buildImportPayload();
      await taskApi.createBatch(projectId, payload);
      return true;
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed — please retry");
      return false;
    } finally {
      setIsImporting(false);
    }
  }, [projectId, breakdown.selectedTasks, sprintConfig.sprintStart]);

  return {
    ...breakdown,
    step,
    setStep,
    viewMode,
    setViewMode,
    ...sprintConfig,
    goToConfirm,
    goToReview,
    goToGoal,
    buildImportPayload,
    importTasks,
    isImporting,
    importError,
    sprintConflicts,
    rebalanceSprints,
    sprintCapacity: SPRINT_CAPACITY,
    circularDeps,
    depBlockedCount,
  };
}
