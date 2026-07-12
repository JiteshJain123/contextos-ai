"use client";

import { cn } from "@/lib/cn";
import type { BreakdownTask, TaskMeta } from "@/features/task/hooks/use-task-breakdown";
import { BreakdownTaskCardV2 } from "./breakdown-task-card-v2";

function SprintCapacityChip({ hours, capacity }: { hours: number; capacity: number }) {
  const pct = Math.min(100, (hours / capacity) * 100);
  const cls =
    pct > 90
      ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
      : pct > 70
        ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400";
  return (
    <span className={cn("rounded px-1.5 py-px text-[10px] font-medium tabular-nums", cls)}>
      {hours}h / {capacity}h
    </span>
  );
}

interface TaskListViewProps {
  tasks: BreakdownTask[];
  onToggle: (id: string) => void;
  onUpdate: (id: string, updates: Partial<BreakdownTask>) => void;
  taskMeta: Map<string, TaskMeta>;
  sprintLoads?: Map<number, number>;
  sprintCapacity?: number;
}

export function TaskListView({
  tasks,
  onToggle,
  onUpdate,
  taskMeta,
  sprintLoads,
  sprintCapacity = 40,
}: TaskListViewProps) {
  const bySprint = new Map<number, BreakdownTask[]>();
  for (const t of tasks) {
    const s = t.sprintOrder ?? 1;
    if (!bySprint.has(s)) bySprint.set(s, []);
    bySprint.get(s)!.push(t);
  }
  const sprints = [...bySprint.keys()].sort();

  return (
    <div className="flex flex-col gap-5">
      {sprints.map((sprint) => (
        <div key={sprint} className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Sprint {sprint}</h3>
            {sprintLoads && (
              <SprintCapacityChip
                hours={sprintLoads.get(sprint) ?? 0}
                capacity={sprintCapacity}
              />
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            {bySprint.get(sprint)!.map((task) => (
              <BreakdownTaskCardV2
                key={task.id}
                task={task}
                onToggle={() => onToggle(task.id)}
                onUpdate={(u) => onUpdate(task.id, u)}
                meta={taskMeta.get(task.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
