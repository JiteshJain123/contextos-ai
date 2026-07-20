"use client";

import { AlertTriangle, Clock, EyeOff, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/cn";
import type { TaskDTO } from "@/lib/validators/task";

// ─── Blocker types ────────────────────────────────────────────────────────────

interface Blocker {
  id: string;
  icon: typeof AlertTriangle;
  message: string;
  detail?: string;
  severity: "critical" | "warning" | "info";
}

const SEVERITY_CLASSES: Record<Blocker["severity"], { dot: string; text: string; bg: string }> = {
  critical: {
    dot: "bg-red-500",
    text: "text-red-600 dark:text-red-400",
    bg:  "bg-red-50 dark:bg-red-950/20",
  },
  warning: {
    dot: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400",
    bg:  "bg-amber-50 dark:bg-amber-950/20",
  },
  info: {
    dot: "bg-blue-400",
    text: "text-blue-600 dark:text-blue-400",
    bg:  "bg-blue-50 dark:bg-blue-950/20",
  },
};

// ─── Derive blockers from real task state ─────────────────────────────────────

function deriveBlockers(tasks: TaskDTO[]): Blocker[] {
  const now = new Date();
  const sevenDaysAgo = now.getTime() - 7 * 86_400_000;
  const threeDaysAgo = now.getTime() - 3 * 86_400_000;
  const blockers: Blocker[] = [];

  // ── Overdue high-priority tasks (REVIEW excluded — it's the final handoff stage) ──
  const overdueHigh = tasks.filter(
    (t) =>
      t.status !== "DONE" &&
      t.status !== "REVIEW" &&
      (t.priority === "URGENT" || t.priority === "HIGH") &&
      t.dueDate != null &&
      new Date(t.dueDate) < now,
  );
  if (overdueHigh.length > 0) {
    blockers.push({
      id: "overdue-high",
      icon: AlertTriangle,
      message: `${overdueHigh.length} high-priority task${overdueHigh.length === 1 ? " is" : "s are"} past due`,
      detail: overdueHigh.slice(0, 2).map((t) => t.title).join(", ") +
        (overdueHigh.length > 2 ? ` +${overdueHigh.length - 2} more` : ""),
      severity: "critical",
    });
  } else {
    // Fall back to all overdue tasks (any priority, REVIEW still excluded)
    const overdueAll = tasks.filter(
      (t) =>
        t.status !== "DONE" &&
        t.status !== "REVIEW" &&
        t.dueDate != null &&
        new Date(t.dueDate) < now,
    );
    if (overdueAll.length > 0) {
      blockers.push({
        id: "overdue-all",
        icon: AlertTriangle,
        message: `${overdueAll.length} task${overdueAll.length === 1 ? "" : "s"} past due date`,
        severity: "warning",
      });
    }
  }

  // ── Tasks stalled in-progress (7+ days idle) ────────────────────────────────
  const stalledInProgress = tasks.filter(
    (t) =>
      t.status === "IN_PROGRESS" &&
      new Date(t.updatedAt).getTime() < sevenDaysAgo,
  );
  if (stalledInProgress.length > 0) {
    blockers.push({
      id: "stalled",
      icon: Clock,
      message: `${stalledInProgress.length} task${stalledInProgress.length === 1 ? "" : "s"} in progress with no update for 7+ days`,
      detail: stalledInProgress.slice(0, 2).map((t) => t.title).join(", ") +
        (stalledInProgress.length > 2 ? ` +${stalledInProgress.length - 2} more` : ""),
      severity: "warning",
    });
  }

  // ── Tasks stuck in review (3+ days idle) ────────────────────────────────────
  const reviewStuck = tasks.filter(
    (t) =>
      t.status === "REVIEW" &&
      new Date(t.updatedAt).getTime() < threeDaysAgo,
  );
  if (reviewStuck.length > 0) {
    blockers.push({
      id: "review-stuck",
      icon: EyeOff,
      message: `${reviewStuck.length} task${reviewStuck.length === 1 ? "" : "s"} waiting in review for 3+ days`,
      detail: reviewStuck.slice(0, 2).map((t) => t.title).join(", ") +
        (reviewStuck.length > 2 ? ` +${reviewStuck.length - 2} more` : ""),
      severity: "warning",
    });
  }


  // ── No active work when tasks remain ────────────────────────────────────────
  const remaining = tasks.filter((t) => t.status !== "DONE");
  const active    = tasks.filter((t) => t.status === "IN_PROGRESS" || t.status === "REVIEW");
  if (remaining.length > 3 && active.length === 0) {
    blockers.push({
      id: "no-active",
      icon: Clock,
      message: `${remaining.length} tasks pending but none in progress`,
      severity: "info",
    });
  }

  return blockers;
}

// ─── Blocker row ──────────────────────────────────────────────────────────────

function BlockerRow({ blocker }: { blocker: Blocker }) {
  const styles = SEVERITY_CLASSES[blocker.severity];
  const Icon   = blocker.icon;

  return (
    <div className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
      <div
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
          styles.bg,
        )}
      >
        <Icon className={cn("size-2.5", styles.text)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("text-[12px] font-medium leading-snug", styles.text)}>
          {blocker.message}
        </p>
        {blocker.detail && (
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground/60">
            {blocker.detail}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

interface BottleneckPanelProps {
  tasks: TaskDTO[];
}

export function BottleneckPanel({ tasks }: BottleneckPanelProps) {
  const blockers = deriveBlockers(tasks);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold">Bottleneck Detection</h3>
        <p className="text-[11px] text-muted-foreground">
          {blockers.length > 0
            ? `${blockers.length} active blocker${blockers.length === 1 ? "" : "s"} detected`
            : "No blockers detected"}
        </p>
      </div>

      {blockers.length === 0 ? (
        <div className="flex h-24 flex-col items-center justify-center gap-1.5 rounded-lg bg-muted/30">
          <CheckCircle2 className="size-4 text-emerald-500/60" />
          <p className="text-[11px] text-muted-foreground/60">Everything looks clear</p>
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          {blockers.map((b) => (
            <BlockerRow key={b.id} blocker={b} />
          ))}
        </div>
      )}
    </div>
  );
}
