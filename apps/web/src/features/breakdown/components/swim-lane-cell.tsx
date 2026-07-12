"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";

import { cn } from "@/lib/cn";
import type { BreakdownTask, TaskMeta } from "@/features/task/hooks/use-task-breakdown";
import type { TaskCategory } from "@contextos-ai/validators/task";
import { BreakdownTaskCardV2 } from "./breakdown-task-card-v2";

function DraggableCard({
  task,
  onToggle,
  onUpdate,
  meta,
  isSprintConflict,
  isCircularDep,
}: {
  task: BreakdownTask;
  onToggle: () => void;
  onUpdate: (u: Partial<BreakdownTask>) => void;
  meta: TaskMeta | undefined;
  isSprintConflict: boolean;
  isCircularDep: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });

  return (
    <div ref={setNodeRef} style={{ opacity: isDragging ? 0.2 : 1 }} className="flex items-start">
      <div
        {...listeners}
        {...attributes}
        className="cursor-grab active:cursor-grabbing shrink-0 self-center px-0.5 py-1 text-muted-foreground/20 hover:text-muted-foreground/60 transition-colors"
      >
        <GripVertical className="size-2.5" />
      </div>
      <div className="min-w-0 flex-1">
        <BreakdownTaskCardV2
          task={task}
          onToggle={onToggle}
          onUpdate={onUpdate}
          meta={meta}
          isSprintConflict={isSprintConflict}
          isCircularDep={isCircularDep}
          compact
        />
      </div>
    </div>
  );
}

interface SwimLaneCellProps {
  id: string;
  tasks: BreakdownTask[];
  sprint: number;
  category: TaskCategory;
  onToggle: (id: string) => void;
  onUpdate: (id: string, updates: Partial<BreakdownTask>) => void;
  getTaskMeta: (id: string) => TaskMeta | undefined;
  sprintConflicts: Set<string>;
  circularDeps: Set<string>;
}

export function SwimLaneCell({
  id,
  tasks,
  onToggle,
  onUpdate,
  getTaskMeta,
  sprintConflicts,
  circularDeps,
}: SwimLaneCellProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[56px] rounded-md border border-dashed border-border/40 transition-all",
        isOver && "border-primary/60 bg-primary/5 scale-[1.01]",
        tasks.length > 0 ? "p-0.5" : "flex items-center justify-center p-1",
      )}
    >
      {tasks.length === 0 ? (
        <span className="select-none text-[9px] text-muted-foreground/20">—</span>
      ) : (
        <div className="flex flex-col gap-0.5">
          {tasks.map((task) => (
            <DraggableCard
              key={task.id}
              task={task}
              onToggle={() => onToggle(task.id)}
              onUpdate={(u) => onUpdate(task.id, u)}
              meta={getTaskMeta(task.id)}
              isSprintConflict={sprintConflicts.has(task.id)}
              isCircularDep={circularDeps.has(task.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
