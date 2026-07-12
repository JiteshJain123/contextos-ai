"use client";

import { useEffect, useRef } from "react";
import { Activity } from "lucide-react";

import type { TaskDTO } from "@contextos-ai/validators/task";

import { useTasks } from "@/features/task/hooks/use-tasks";
import { useExecutionIntelligence } from "../hooks/use-execution-intelligence";
import { useLiveEvents } from "../hooks/use-live-events";
import { useWorkloadIntelligence } from "../hooks/use-workload-intelligence";
import { ExecutionScore } from "./execution-score";
import { RiskPanel } from "./risk-panel";
import { LiveActivityFeed } from "./live-activity-feed";
import { WorkloadIntelligencePanel } from "./workload-intelligence";
import { ExecutionSnapshot } from "./execution-snapshot";
import { PriorityQueuePanel } from "./priority-queue";
import { BottleneckPanel } from "./bottleneck-panel";

// Module-level stable empty array — avoids creating a new [] reference on every render
// when tasksQuery.data is undefined/null, keeping useEffect deps stable without useMemo.
const EMPTY_TASKS: TaskDTO[] = [];

// ─────────────────────────────────────────────────────────
// Loading Skeleton
// ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-muted h-20 animate-pulse rounded-xl" />
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="bg-muted h-40 animate-pulse rounded-xl" />
        <div className="bg-muted h-40 animate-pulse rounded-xl" />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="bg-muted h-48 animate-pulse rounded-xl" />
        <div className="bg-muted h-48 animate-pulse rounded-xl" />
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_300px]">
        <div className="bg-muted h-48 animate-pulse rounded-xl" />
        <div className="bg-muted h-48 animate-pulse rounded-xl" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Empty State
// ─────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="relative overflow-hidden flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border py-20 text-center">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/3 via-transparent to-transparent"
        aria-hidden="true"
      />
      <div className="relative flex size-14 items-center justify-center rounded-2xl bg-muted shadow-sm">
        <Activity className="size-6 text-muted-foreground/60" aria-hidden="true" />
      </div>

      <div className="relative">
        <h3 className="text-sm font-semibold">No tasks yet</h3>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground leading-relaxed">
          Add tasks to your board to see execution analytics and workload health.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────

interface ExecutionPageProps {
  projectId: string;
}

// ─────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────

export function ExecutionPage({ projectId }: ExecutionPageProps) {
  const tasksQuery = useTasks(projectId);

  // Stable array reference — EMPTY_TASKS is module-level, so no new [] on every render
  const tasks = Array.isArray(tasksQuery.data) ? tasksQuery.data : EMPTY_TASKS;

  // Core intelligence
  const intel = useExecutionIntelligence(tasks);
  const workload = useWorkloadIntelligence(tasks);

  // Live events
  const { events: liveEvents, isConnected, pushEvent } = useLiveEvents(projectId);

  // Previous task statuses
  const prevStatusRef = useRef<Map<string, string> | null>(null);

  // Prevent reseeding
  const seededRef = useRef(false);

  // ───────────────────────────────────────────────────────
  // Live Feed Logic
  // ───────────────────────────────────────────────────────

  useEffect(() => {
    if (tasks.length === 0) return;

    // First render
    if (prevStatusRef.current === null) {
      prevStatusRef.current = new Map(tasks.map((t) => [t.id, t.status]));

      // Seed initial feed
      if (!seededRef.current) {
        seededRef.current = true;

        const seedCandidates = tasks
          .filter((t) => t.status !== "TODO")
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, 5);

        for (const t of [...seedCandidates].reverse()) {
          pushEvent({
            type: "task_status_changed",
            projectId,
            targetId: t.id,
            metadata: {
              taskTitle: t.title,
              status: t.status,
            },
            receivedAt: new Date(t.updatedAt),
          });
        }
      }

      return;
    }

    // Detect status changes
    const prev = prevStatusRef.current;

    for (const task of tasks) {
      const prevStatus = prev.get(task.id);

      if (prevStatus !== undefined && prevStatus !== task.status) {
        pushEvent({
          type: "task_status_changed",
          projectId,
          targetId: task.id,
          metadata: {
            taskTitle: task.title,
            status: task.status,
            prevStatus,
          },
        });
      }
    }

    prevStatusRef.current = new Map(tasks.map((t) => [t.id, t.status]));
  }, [tasks, pushEvent, projectId]);

  // ───────────────────────────────────────────────────────
  // Critical Task Logic
  // ───────────────────────────────────────────────────────

  const criticalTasks = tasks.filter((t) => {
    if (t.status === "DONE" || t.status === "REVIEW") {
      return false;
    }

    if (t.priority === "URGENT") {
      return true;
    }

    if (!t.dueDate) {
      return false;
    }

    const dueDate = new Date(t.dueDate);
    const now = new Date().getTime();

    const daysDiff = (now - dueDate.getTime()) / (1000 * 60 * 60 * 24);

    return daysDiff >= 3;
  }).length;

  // ───────────────────────────────────────────────────────
  // Loading / Empty
  // ───────────────────────────────────────────────────────

  if (tasksQuery.isLoading) {
    return <LoadingSkeleton />;
  }

  if (intel.totalTasks === 0) {
    return <EmptyState />;
  }

  // ───────────────────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
          <Activity className="size-4 text-primary" aria-hidden="true" />
        </div>
        <h1 className="text-lg font-semibold tracking-tight">Execution Dashboard</h1>
      </div>

      {/* Snapshot */}
      <ExecutionSnapshot
        doneTasks={intel.doneTasks}
        inProgressTasks={intel.inProgressTasks}
        reviewTasks={intel.reviewTasks}
        overdueTasks={intel.overdueTasks}
        criticalTasks={criticalTasks}
      />

      {/* Score + Risk */}
      <div className="grid gap-3 sm:grid-cols-2">
        <ExecutionScore
          confidence={intel.executionConfidence}
          label={intel.confidenceLabel}
          riskLevel={intel.riskLevel}
          completionRate={intel.completionRate}
          doneTasks={intel.doneTasks}
          totalTasks={intel.totalTasks}
        />

        <RiskPanel
          riskProbability={intel.launchRiskProbability}
          riskLevel={intel.riskLevel}
          riskFactors={intel.riskFactors}
          overdueTasks={intel.overdueTasks}
          stalledTasks={intel.stalledTasks}
          criticalBlockedCount={intel.criticalBlockedCount}
        />
      </div>

      {/* Priority + Bottleneck */}
      <div className="grid gap-3 lg:grid-cols-2">
        <PriorityQueuePanel tasks={tasks} />
        <BottleneckPanel tasks={tasks} />
      </div>

      {/* Workload + Activity */}
      <div className="grid gap-3 lg:grid-cols-[1fr_300px]">
        <WorkloadIntelligencePanel
          workload={workload}
          totalTasks={intel.totalTasks}
          doneTasks={intel.doneTasks}
          inProgressTasks={intel.inProgressTasks}
          reviewTasks={intel.reviewTasks}
        />

        <LiveActivityFeed events={liveEvents} isConnected={isConnected} />
      </div>
    </div>
  );
}
