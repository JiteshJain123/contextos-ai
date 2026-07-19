"use client";

import { useMemo, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";

import { cn } from "@/lib/cn";

import { useTasks } from "../hooks/use-tasks";

// ─── Animated progress bar ────────────────────────────────────────────────────

function ProgressBar({ value, colorClass }: { value: number; colorClass: string }) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-muted/60">
      <div
        className={cn("h-full rounded-full transition-[width] duration-700 ease-out", colorClass)}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

// ─── Single metric pill ───────────────────────────────────────────────────────

function Metric({
  icon,
  value,
  label,
  accent,
}: {
  icon: ReactNode;
  value: string | number;
  label: string;
  accent?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex items-center gap-1 text-xs",
        accent ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
      )}
    >
      {icon}
      <span className="font-semibold tabular-nums">{value}</span>
      <span className="text-muted-foreground/60">{label}</span>
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProjectMetricsBar({ projectId }: { projectId: string }) {
  const query = useTasks(projectId);

  const m = useMemo(() => {
    const tasks = query.data ?? [];
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === "DONE").length;
    const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length;
    const now = new Date();
    const overdue = tasks.filter(
      (t) => t.status !== "DONE" && t.dueDate && new Date(t.dueDate) < now,
    ).length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, inProgress, overdue, pct };
  }, [query.data]);

  if (query.isLoading) {
    return (
      <div className="flex items-center gap-3 py-1">
        <div className="h-1 flex-1 animate-pulse rounded-full bg-muted" />
        <div className="h-3 w-8 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (!query.data || m.total === 0) return null;

  const colorClass =
    m.pct === 100 ? "bg-emerald-500" : m.overdue > 0 ? "bg-amber-500" : "bg-primary";

  return (
    <div className="flex flex-col gap-1.5 rounded-lg bg-muted/30 px-3 py-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <Metric
          icon={<CheckCircle2 className="size-3 text-emerald-500" />}
          value={m.done}
          label={`/ ${m.total} done`}
        />
        {m.inProgress > 0 && (
          <Metric
            icon={<Clock className="size-3 text-blue-500" />}
            value={m.inProgress}
            label="in progress"
          />
        )}
        {m.overdue > 0 && (
          <Metric
            icon={<AlertTriangle className="size-3" />}
            value={m.overdue}
            label="overdue"
            accent
          />
        )}
        <span className="ml-auto text-xs font-bold tabular-nums text-muted-foreground">
          {m.pct}%
        </span>
      </div>
      <ProgressBar value={m.pct} colorClass={colorClass} />
    </div>
  );
}
