"use client";

import React, { useState, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Monitor, Server, Database, TestTube, Rocket } from "lucide-react";

import { cn } from "@/lib/cn";
import type { BreakdownTask, TaskMeta } from "@/features/task/hooks/use-task-breakdown";
import type { TaskCategory } from "@contextos-ai/validators/task";
import type { SprintWindow } from "../lib/sprint-dates";
import { formatSprintRange } from "../lib/sprint-dates";
import { ALL_CATEGORIES, CATEGORY_META } from "../lib/category-meta";
import { SwimLaneCell } from "./swim-lane-cell";
import { BreakdownTaskCardV2 } from "./breakdown-task-card-v2";

const ICONS = { Monitor, Server, Database, TestTube, Rocket };
const SPRINT_CAPACITY = 40;

interface RoadmapGridProps {
  tasks: BreakdownTask[];
  sprintWindows: SprintWindow[];
  onToggle: (id: string) => void;
  onUpdate: (id: string, updates: Partial<BreakdownTask>) => void;
  taskMeta: Map<string, TaskMeta>;
  sprintLoads: Map<number, number>;
  sprintConflicts: Set<string>;
  circularDeps: Set<string>;
}

export function RoadmapGrid({
  tasks,
  sprintWindows,
  onToggle,
  onUpdate,
  taskMeta,
  sprintLoads,
  sprintConflicts,
  circularDeps,
}: RoadmapGridProps) {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  // Per-category total selected hours — workload balance signal
  const categoryHours = useMemo(() => {
    const hours = new Map<TaskCategory, number>();
    for (const task of tasks) {
      if (!task.selected) continue;
      const cat = (task.category ?? "backend") as TaskCategory;
      hours.set(cat, (hours.get(cat) ?? 0) + (task.estimatedHours ?? 0));
    }
    return hours;
  }, [tasks]);

  function getCellTasks(sprint: number, category: TaskCategory) {
    return tasks.filter(
      (t) => (t.sprintOrder ?? 1) === sprint && (t.category ?? "backend") === category,
    );
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveTaskId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTaskId(null);
    const { active, over } = event;
    if (!over) return;
    const [sprintStr, category] = String(over.id).split("::");
    const sprint = Number(sprintStr);
    if (!sprint || !category) return;
    onUpdate(String(active.id), {
      sprintOrder: sprint,
      category: category as TaskCategory,
    });
  }

  const activeTask = activeTaskId ? tasks.find((t) => t.id === activeTaskId) : null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="overflow-x-auto rounded-xl border border-border">
        <div
          className="grid min-w-[640px]"
          style={{
            gridTemplateColumns: `128px repeat(${ALL_CATEGORIES.length}, 1fr)`,
          }}
        >
          {/* Header row — category labels + workload hours */}
          <div className="border-b border-r border-border bg-muted/50 p-1.5" />
          {ALL_CATEGORIES.map((cat) => {
            const meta = CATEGORY_META[cat];
            const Icon = ICONS[meta.icon as keyof typeof ICONS];
            const hours = categoryHours.get(cat) ?? 0;
            return (
              <div
                key={cat}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 border-b border-r border-border px-1.5 py-1 last:border-r-0",
                  meta.color,
                  meta.bg,
                )}
              >
                <div className="flex items-center gap-1">
                  <Icon className="size-3 shrink-0" />
                  <span className="truncate text-[10px] font-semibold">{meta.label}</span>
                </div>
                {hours > 0 && (
                  <span className="text-[9px] opacity-60 tabular-nums">{hours}h</span>
                )}
              </div>
            );
          })}

          {/* Sprint rows */}
          {sprintWindows.map((window) => {
            const hours = sprintLoads.get(window.sprint) ?? 0;
            const pct = Math.min(100, (hours / SPRINT_CAPACITY) * 100);
            const barColor =
              pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-emerald-500";
            const labelColor =
              pct > 90
                ? "text-red-600 dark:text-red-400"
                : pct > 70
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-muted-foreground";
            const selectedCount = tasks.filter(
              (t) => t.selected && (t.sprintOrder ?? 1) === window.sprint,
            ).length;

            return (
              <React.Fragment key={window.sprint}>
                {/* Sprint label + capacity bar */}
                <div className="flex flex-col justify-center gap-1 border-b border-r border-border bg-muted/30 px-2 py-2 last:border-b-0">
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-semibold">S{window.sprint}</span>
                      {selectedCount > 0 && (
                        <span className="rounded bg-muted px-1 py-px text-[9px] text-muted-foreground tabular-nums">
                          {selectedCount}
                        </span>
                      )}
                    </div>
                    <span className="mt-0.5 block text-[9px] leading-none text-muted-foreground">
                      {formatSprintRange(window).replace(`Sprint ${window.sprint} · `, "")}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full transition-all duration-300", barColor)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className={cn("text-[9px] tabular-nums", labelColor)}>
                      {hours}h/{SPRINT_CAPACITY}h
                    </span>
                  </div>
                </div>

                {/* Category swim lane cells */}
                {ALL_CATEGORIES.map((cat) => (
                  <div
                    key={`${window.sprint}-${cat}`}
                    className="border-b border-r border-border p-0.5 last:border-r-0"
                  >
                    <SwimLaneCell
                      id={`${window.sprint}::${cat}`}
                      tasks={getCellTasks(window.sprint, cat)}
                      sprint={window.sprint}
                      category={cat}
                      onToggle={onToggle}
                      onUpdate={onUpdate}
                      getTaskMeta={(id) => taskMeta.get(id)}
                      sprintConflicts={sprintConflicts}
                      circularDeps={circularDeps}
                    />
                  </div>
                ))}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Drag overlay — rendered outside grid for correct z-index */}
      <DragOverlay dropAnimation={{ duration: 120, easing: "ease" }}>
        {activeTask && (
          <div className="rotate-1 opacity-90 shadow-xl">
            <BreakdownTaskCardV2
              task={activeTask}
              meta={taskMeta.get(activeTask.id)}
              isSprintConflict={sprintConflicts.has(activeTask.id)}
              isCircularDep={circularDeps.has(activeTask.id)}
              compact
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
