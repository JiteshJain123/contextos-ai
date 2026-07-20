"use client";

import { motion } from "motion/react";
import { Users, AlertTriangle, Flame, TrendingDown, Activity, BarChart2, UserCog, CheckCircle2, Clock } from "lucide-react";

import { cn } from "@/lib/cn";
import type { AssigneeWorkload, WorkloadIntelligence } from "../hooks/use-workload-intelligence";

// ─── Burnout badge ────────────────────────────────────────────────────────────

const BURNOUT_CONFIG: Record<
  AssigneeWorkload["burnoutRisk"],
  { label: string; classes: string } | null
> = {
  none: null,
  low: {
    label: "At risk",
    classes:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400",
  },
  medium: {
    label: "Burnout risk",
    classes:
      "bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400",
  },
  high: {
    label: "High burnout",
    classes: "bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-400",
  },
};

// ─── Single assignee row ──────────────────────────────────────────────────────

function AssigneeRow({
  assignee,
  maxActive,
  index,
}: {
  assignee: AssigneeWorkload;
  maxActive: number;
  index: number;
}) {
  const pct = maxActive > 0 ? (assignee.activeTasks / maxActive) * 100 : 0;
  const burnout = BURNOUT_CONFIG[assignee.burnoutRisk];

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05, ease: "easeOut" }}
      className="flex flex-col gap-1.5"
    >
      {/* Name row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          {/* Avatar */}
          <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-bold text-muted-foreground">
            {(assignee.name[0] ?? "?").toUpperCase()}
          </div>
          <span className="max-w-[110px] truncate text-[11px] font-medium">
            {assignee.name}
          </span>

          {/* Overloaded chip */}
          {assignee.isOverloaded && (
            <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-semibold text-red-600 dark:bg-red-950/30 dark:text-red-400">
              <Flame className="size-2.5" />
              Overloaded
            </span>
          )}

          {/* Under-utilized chip */}
          {assignee.isUnderutilized && !assignee.isOverloaded && (
            <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-semibold text-blue-600 dark:bg-blue-950/30 dark:text-blue-400">
              <TrendingDown className="size-2.5" />
              Under
            </span>
          )}
        </div>

        {/* Right-side stats */}
        <div className="flex shrink-0 items-center gap-2">
          {burnout && (
            <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-semibold", burnout.classes)}>
              {burnout.label}
            </span>
          )}
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {assignee.activeTasks} active
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 overflow-hidden rounded-full bg-muted/60">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.55, delay: index * 0.05 + 0.1, ease: "easeOut" }}
          className={cn(
            "h-full rounded-full",
            assignee.isOverloaded
              ? "bg-red-500"
              : assignee.burnoutRisk === "medium"
                ? "bg-orange-400"
                : assignee.burnoutRisk === "low"
                  ? "bg-amber-400"
                  : "bg-primary",
          )}
        />
      </div>

      {/* Overdue note */}
      {assignee.overdueTasks > 0 && (
        <p className="text-[10px] text-red-500/80">
          {assignee.overdueTasks} overdue task{assignee.overdueTasks !== 1 ? "s" : ""}
        </p>
      )}
    </motion.div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

interface WorkloadIntelligencePanelProps {
  workload: WorkloadIntelligence;
  totalTasks?: number;
  doneTasks?: number;
  inProgressTasks?: number;
  reviewTasks?: number;
  unassignedTasks?: number;
}

export function WorkloadIntelligencePanel({
  workload,
  totalTasks = 0,
  doneTasks = 0,
  inProgressTasks = 0,
  reviewTasks = 0,
}: WorkloadIntelligencePanelProps) {
  if (workload.teamSize === 0) {
    const todoTasks = totalTasks - doneTasks - inProgressTasks - reviewTasks;

    return (
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" />
            <div>
              <h3 className="text-sm font-semibold">Task Breakdown</h3>
              <p className="text-[11px] text-muted-foreground">No assignees yet — showing board summary</p>
            </div>
          </div>
          {workload.unassignedTasks > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {workload.unassignedTasks} unassigned
            </span>
          )}
        </div>

        {/* Board summary grid */}
        {totalTasks > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: CheckCircle2, label: "Done",        value: doneTasks,       colorClass: "text-emerald-500" },
              { icon: Activity,     label: "In Progress", value: inProgressTasks, colorClass: "text-blue-500"    },
              { icon: Clock,        label: "In Review",   value: reviewTasks,     colorClass: "text-purple-500"  },
              { icon: BarChart2,    label: "Todo",        value: todoTasks,       colorClass: "text-muted-foreground" },
            ].map(({ icon: Icon, label, value, colorClass }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-1 rounded-lg bg-muted/40 p-2.5 text-center"
              >
                <Icon className={`size-3.5 ${colorClass}`} />
                <span className="text-base font-bold tabular-nums leading-none">{value}</span>
                <span className="text-[9px] text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Soft assignee hint */}
        <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground/55">
          <UserCog className="size-3 shrink-0" />
          Assign tasks to team members for per-person workload tracking
        </p>
      </div>
    );
  }

  const maxActive = Math.max(...workload.assignees.map((a) => a.activeTasks), 1);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Team Workload</h3>
          <p className="text-[11px] text-muted-foreground">
            {workload.teamSize} member{workload.teamSize !== 1 ? "s" : ""} ·{" "}
            {workload.avgTasksPerPerson} tasks/person avg
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {workload.overloadedCount > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600 dark:bg-red-950/30 dark:text-red-400">
              <AlertTriangle className="size-2.5" />
              {workload.overloadedCount} overloaded
            </span>
          )}
          {workload.unassignedTasks > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {workload.unassignedTasks} unassigned
            </span>
          )}
        </div>
      </div>

      {/* Per-assignee rows */}
      <div className="flex flex-col gap-3">
        {workload.assignees.map((assignee, i) => (
          <AssigneeRow
            key={assignee.userId}
            assignee={assignee}
            maxActive={maxActive}
            index={i}
          />
        ))}
      </div>

      {/* Advisory banner */}
      {workload.overloadedCount > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400">
          <AlertTriangle className="mr-1.5 inline size-3" />
          {workload.overloadedCount === 1
            ? "1 team member is"
            : `${workload.overloadedCount} team members are`}{" "}
          carrying too many active tasks — consider redistributing before the next sprint.
        </div>
      )}
    </div>
  );
}
