"use client";

import {
  closestCorners,
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Lightbulb } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

import type { TaskDTO, TaskStatus } from "@contextos-ai/validators/task";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

import { useMoveTask } from "../hooks/use-move-task";
import { useTasks } from "../hooks/use-tasks";
import { computeDropPosition } from "../lib/position";
import { TASK_STATUSES, statusMeta } from "../lib/status";
import { AiTaskBreakdownDialog } from "./ai-task-breakdown-dialog";
import { AiTaskSuggestionsDialog } from "./ai-task-suggestions";
import { KanbanColumn } from "./kanban-column";
import { TaskCard } from "./task-card";

export function KanbanBoard({ projectId }: { projectId: string }) {
  const query = useTasks(projectId);
  const moveMutation = useMoveTask(projectId);
  const pathname = usePathname();
  const [activeTask, setActiveTask] = useState<TaskDTO | null>(null);

  const insightsHref = `${pathname}/insights`;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const grouped = useMemo(() => {
    const buckets: Record<TaskStatus, TaskDTO[]> = {
      TODO: [],
      IN_PROGRESS: [],
      REVIEW: [],
      DONE: [],
    };
    for (const t of query.data ?? []) {
      buckets[t.status].push(t);
    }
    for (const k of TASK_STATUSES) {
      buckets[k].sort((a, b) => a.position - b.position);
    }
    return buckets;
  }, [query.data]);

  function handleDragStart(e: DragStartEvent) {
    const task = e.active.data.current?.task as TaskDTO | undefined;
    if (task) setActiveTask(task);
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = e;
    if (!over) return;

    const activeTask = active.data.current?.task as TaskDTO | undefined;
    if (!activeTask) return;

    const overData = over.data.current;
    let targetStatus: TaskStatus;
    let beforeId: string | undefined;
    let afterId: string | undefined;

    if (overData?.type === "column") {
      targetStatus = overData.status as TaskStatus;
      const col = grouped[targetStatus];
      beforeId = col[col.length - 1]?.id;
      afterId = undefined;
    } else if (overData?.type === "task") {
      const overTask = overData.task as TaskDTO;
      targetStatus = overTask.status;
      const col = grouped[targetStatus];
      const overIdx = col.findIndex((t) => t.id === overTask.id);
      const activeIdx = col.findIndex((t) => t.id === activeTask.id);
      if (activeIdx === -1 || activeIdx > overIdx) {
        beforeId = col[overIdx - 1]?.id;
        afterId = col[overIdx]?.id;
      } else {
        beforeId = col[overIdx]?.id;
        afterId = col[overIdx + 1]?.id;
      }
    } else {
      return;
    }

    const beforeTask =
      beforeId === activeTask.id ? undefined : grouped[targetStatus].find((t) => t.id === beforeId);
    const afterTask =
      afterId === activeTask.id ? undefined : grouped[targetStatus].find((t) => t.id === afterId);
    const newPosition = computeDropPosition(beforeTask, afterTask);

    if (activeTask.status === targetStatus && activeTask.position === newPosition) return;

    moveMutation.mutate({
      taskId: activeTask.id,
      status: targetStatus,
      position: newPosition,
    });
  }

  if (query.isLoading) {
    return <BoardSkeleton />;
  }

  if (query.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Couldn&apos;t load tasks</AlertTitle>
        <AlertDescription>
          {query.error instanceof Error ? query.error.message : "Unknown error"}
        </AlertDescription>
      </Alert>
    );
  }

  const totalTasks = (query.data ?? []).length;

  return (
    <div>
      {/* Board toolbar */}
      <div className="mb-4 flex items-center gap-2">
        {/* Status counts — scrollable on tiny screens */}
        <div
          className="flex flex-1 items-center gap-1.5 overflow-x-auto"
          style={{ scrollbarWidth: "none" }}
        >
          {TASK_STATUSES.map((s) => {
            const meta = statusMeta[s];
            const count = grouped[s].length;
            return (
              <span
                key={s}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  count > 0
                    ? "border-border bg-card text-foreground"
                    : "border-border/50 bg-muted/30 text-muted-foreground/60",
                )}
              >
                <span className={cn("size-1.5 rounded-full", meta.dot)} />
                <span className="hidden sm:inline">{meta.label}</span>
                <span className="tabular-nums">{count}</span>
              </span>
            );
          })}
          {totalTasks > 0 && (
            <span className="shrink-0 text-[11px] text-muted-foreground/40 pl-0.5">
              {totalTasks} total
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" asChild>
            <Link href={insightsHref as never}>
              <Lightbulb className="size-3.5 text-amber-500" />
              <span className="hidden sm:inline">Insights</span>
            </Link>
          </Button>
          <AiTaskSuggestionsDialog projectId={projectId} />
          <AiTaskBreakdownDialog projectId={projectId} />
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0">
          <div className="grid min-h-[60vh] min-w-[680px] grid-cols-4 gap-4 sm:min-w-0 sm:grid-cols-2 lg:grid-cols-4">
            {TASK_STATUSES.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                tasks={grouped[status]}
                projectId={projectId}
              />
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} projectId={projectId} isOverlay /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-6 w-16 animate-pulse rounded-full bg-muted" />
          ))}
        </div>
        <div className="flex gap-2">
          <div className="h-7 w-20 animate-pulse rounded-md bg-muted" />
          <div className="h-7 w-24 animate-pulse rounded-md bg-muted" />
        </div>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="grid min-w-[680px] grid-cols-4 gap-4 sm:min-w-0 sm:grid-cols-2 lg:grid-cols-4">
          {TASK_STATUSES.map((s) => (
            <ColumnSkeleton key={s} status={s} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ColumnSkeleton({ status }: { status: TaskStatus }) {
  const meta = statusMeta[status];
  return (
    <div className="flex flex-col rounded-xl border-t-2 border border-border bg-muted/20">
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2.5">
        <span className={cn("size-2 rounded-full", meta.dot)} />
        <span className="text-sm font-medium text-muted-foreground">{meta.label}</span>
      </div>
      <div className="flex flex-col gap-2 p-2">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="relative h-[72px] overflow-hidden animate-pulse rounded-lg border border-border bg-card"
          >
            <div
              className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
