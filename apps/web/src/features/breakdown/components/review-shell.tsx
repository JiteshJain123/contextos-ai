"use client";

import { useState, useMemo } from "react";
import { AlertTriangle, GitBranch, LayoutGrid, List, RefreshCw, Shuffle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { BreakdownTask, TaskMeta } from "@/features/task/hooks/use-task-breakdown";
import type { ViewMode } from "../hooks/use-breakdown-v2";
import { SPRINT_CAPACITY } from "../hooks/use-breakdown-v2";
import type { SprintWindow } from "../lib/sprint-dates";
import { ALL_CATEGORIES, CATEGORY_META } from "../lib/category-meta";
import { RoadmapGrid } from "./roadmap-grid";
import { DependencyGraph } from "./dependency-graph";
import { TaskListView } from "./task-list-view";

type FilterMode = "all" | "critical" | "blocked" | "conflicts";

const VIEW_TABS: { mode: ViewMode; label: string; icon: typeof LayoutGrid }[] = [
  { mode: "roadmap", label: "Roadmap", icon: LayoutGrid },
  { mode: "graph", label: "Graph", icon: GitBranch },
  { mode: "list", label: "List", icon: List },
];

interface ReviewShellProps {
  tasks: BreakdownTask[];
  viewMode: ViewMode;
  setViewMode: (m: ViewMode) => void;
  sprintWindows: SprintWindow[];
  onToggle: (id: string) => void;
  onUpdate: (id: string, updates: Partial<BreakdownTask>) => void;
  taskMeta: Map<string, TaskMeta>;
  sprintLoads: Map<number, number>;
  sprintConflicts: Set<string>;
  circularDeps: Set<string>;
  depBlockedCount: number;
  onRebalance: () => void;
}

export function ReviewShell({
  tasks,
  viewMode,
  setViewMode,
  sprintWindows,
  onToggle,
  onUpdate,
  taskMeta,
  sprintLoads,
  sprintConflicts,
  circularDeps,
  depBlockedCount,
  onRebalance,
}: ReviewShellProps) {
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  const conflictCount = sprintConflicts.size;
  const circularCount = circularDeps.size;

  const criticalCount = useMemo(
    () => tasks.filter((t) => taskMeta.get(t.id)?.isCriticalPath).length,
    [tasks, taskMeta],
  );

  const totalBlockedCount = useMemo(
    () =>
      tasks.filter(
        (t) =>
          taskMeta.get(t.id)?.isDepBlocked ||
          sprintConflicts.has(t.id) ||
          circularDeps.has(t.id),
      ).length,
    [tasks, taskMeta, sprintConflicts, circularDeps],
  );

  const visibleTasks = useMemo(() => {
    if (filterMode === "critical") return tasks.filter((t) => taskMeta.get(t.id)?.isCriticalPath);
    if (filterMode === "blocked")
      return tasks.filter(
        (t) =>
          taskMeta.get(t.id)?.isDepBlocked ||
          sprintConflicts.has(t.id) ||
          circularDeps.has(t.id),
      );
    if (filterMode === "conflicts") return tasks.filter((t) => sprintConflicts.has(t.id));
    return tasks;
  }, [tasks, filterMode, taskMeta, sprintConflicts, circularDeps]);

  // Per-category selected hours for workload balance strip
  const categoryHours = useMemo(() => {
    const hours = new Map<string, number>();
    for (const task of tasks) {
      if (!task.selected) continue;
      const cat = task.category ?? "backend";
      hours.set(cat, (hours.get(cat) ?? 0) + (task.estimatedHours ?? 0));
    }
    return hours;
  }, [tasks]);
  const totalSelectedHours = useMemo(
    () => [...categoryHours.values()].reduce((a, b) => a + b, 0),
    [categoryHours],
  );

  const FILTER_TABS: { mode: FilterMode; label: string; count: number }[] = [
    { mode: "all", label: "All", count: tasks.length },
    { mode: "critical", label: "Critical", count: criticalCount },
    { mode: "blocked", label: "Blocked", count: totalBlockedCount },
    { mode: "conflicts", label: "Conflicts", count: conflictCount },
  ];

  return (
    <div className="flex flex-col gap-2.5">
      {/* Sprint capacity summary strip */}
      {tasks.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-1.5">
          <span className="shrink-0 text-[11px] font-medium text-muted-foreground">Capacity</span>
          <div className="flex flex-1 items-center gap-3 overflow-x-auto">
            {[1, 2, 3, 4].map((s) => {
              const hours = sprintLoads.get(s) ?? 0;
              const pct = Math.min(100, (hours / SPRINT_CAPACITY) * 100);
              const barColor =
                pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-emerald-500";
              const textColor =
                pct > 90
                  ? "text-red-600 dark:text-red-400"
                  : pct > 70
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-emerald-600 dark:text-emerald-400";
              return (
                <div key={s} className="flex shrink-0 flex-col gap-0.5" style={{ minWidth: 52 }}>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] text-muted-foreground">S{s}</span>
                    <span className={cn("text-[10px] font-medium tabular-nums", textColor)}>
                      {hours}h
                    </span>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full transition-all duration-300", barColor)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRebalance}
            className="h-6 shrink-0 gap-1 px-2 text-[10px]"
            title="Auto-distribute tasks across sprints respecting dependencies and capacity"
          >
            <Shuffle className="size-3" />
            Rebalance
          </Button>
        </div>
      )}

      {/* Workload by category strip */}
      {totalSelectedHours > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto rounded-lg border border-border bg-muted/20 px-3 py-1.5">
          <span className="shrink-0 text-[11px] font-medium text-muted-foreground">Workload</span>
          <div className="flex flex-1 items-center gap-1.5 overflow-x-auto">
            {ALL_CATEGORIES.map((cat) => {
              const h = categoryHours.get(cat) ?? 0;
              if (h === 0) return null;
              const meta = CATEGORY_META[cat];
              return (
                <span
                  key={cat}
                  className={cn(
                    "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium",
                    meta.bg,
                    meta.color,
                  )}
                >
                  {meta.label.slice(0, 2)}: {h}h
                </span>
              );
            })}
          </div>
          <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
            {totalSelectedHours}h total
          </span>
        </div>
      )}

      {/* Circular dependency warning */}
      {circularCount > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
          <AlertTriangle className="mt-px size-3.5 shrink-0" />
          <span>
            <strong>{circularCount}</strong> task{circularCount === 1 ? "" : "s"} involved in
            circular dependencies — these tasks block each other and cannot be ordered.{" "}
            <button
              onClick={onRebalance}
              className="font-semibold underline underline-offset-2 hover:opacity-80"
            >
              Rebalance
            </button>{" "}
            or remove the circular links.
          </span>
        </div>
      )}

      {/* Sprint ordering conflict warning */}
      {conflictCount > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400">
          <AlertTriangle className="mt-px size-3.5 shrink-0" />
          <span>
            <strong>{conflictCount}</strong> task{conflictCount === 1 ? "" : "s"} depend on tasks
            in the same or a later sprint —{" "}
            <button
              onClick={onRebalance}
              className="font-semibold underline underline-offset-2 hover:opacity-80"
            >
              Rebalance
            </button>{" "}
            to auto-fix.
          </span>
        </div>
      )}

      {/* Dep-blocked warning (unselected prerequisites) */}
      {depBlockedCount > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-[11px] text-orange-700 dark:border-orange-900/40 dark:bg-orange-950/20 dark:text-orange-400">
          <AlertTriangle className="mt-px size-3.5 shrink-0" />
          <span>
            <strong>{depBlockedCount}</strong> selected task
            {depBlockedCount === 1 ? " is" : "s are"} blocked by unselected prerequisites — select
            the prerequisites or deselect the blocked tasks.
          </span>
        </div>
      )}

      {/* View + filter toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* View mode tabs */}
        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/30 p-0.5">
          {VIEW_TABS.map(({ mode, label, icon: Icon }) => (
            <Button
              key={mode}
              variant="ghost"
              size="sm"
              onClick={() => setViewMode(mode)}
              className={cn(
                "h-6 gap-1 px-2.5 text-[10px]",
                viewMode === mode && "bg-background text-foreground shadow-sm",
              )}
            >
              <Icon className="size-2.5" />
              {label}
            </Button>
          ))}
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground">Filter:</span>
          {FILTER_TABS.map(({ mode, label, count }) => {
            const disabled = mode !== "all" && count === 0;
            return (
              <button
                key={mode}
                onClick={() => !disabled && setFilterMode(mode)}
                className={cn(
                  "rounded-full border px-2 py-px text-[10px] transition-colors",
                  filterMode === mode
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                  disabled && "pointer-events-none opacity-30",
                )}
              >
                {label} {count > 0 && <span className="tabular-nums">{count}</span>}
              </button>
            );
          })}
          {filterMode !== "all" && (
            <button
              onClick={() => setFilterMode("all")}
              className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="size-2.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* View content */}
      {visibleTasks.length === 0 && filterMode !== "all" ? (
        <div className="flex items-center justify-center rounded-lg border border-dashed border-border py-8 text-sm text-muted-foreground">
          No tasks match this filter.
        </div>
      ) : viewMode === "roadmap" ? (
        <RoadmapGrid
          tasks={visibleTasks}
          sprintWindows={sprintWindows}
          onToggle={onToggle}
          onUpdate={onUpdate}
          taskMeta={taskMeta}
          sprintLoads={sprintLoads}
          sprintConflicts={sprintConflicts}
          circularDeps={circularDeps}
        />
      ) : viewMode === "graph" ? (
        <DependencyGraph tasks={visibleTasks} />
      ) : (
        <TaskListView
          tasks={visibleTasks}
          onToggle={onToggle}
          onUpdate={onUpdate}
          taskMeta={taskMeta}
          sprintLoads={sprintLoads}
          sprintCapacity={SPRINT_CAPACITY}
        />
      )}
    </div>
  );
}
