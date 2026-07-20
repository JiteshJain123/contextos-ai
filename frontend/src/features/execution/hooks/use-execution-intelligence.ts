"use client";

import { useMemo } from "react";
import type { TaskDTO } from "@/lib/validators/task";

export type RiskLevel = "low" | "medium" | "high" | "critical";
export type ConfidenceLabel = "excellent" | "good" | "at-risk" | "critical";

export interface RiskFactor {
  label: string;
  contribution: number; // 0–40 range
  description: string;
}

export interface ExecutionIntelligence {
  totalTasks: number;
  doneTasks: number;
  inProgressTasks: number;
  reviewTasks: number;
  overdueTasks: number;
  stalledTasks: number;
  completionRate: number;

  launchRiskProbability: number;
  riskLevel: RiskLevel;
  riskFactors: RiskFactor[];

  executionConfidence: number;
  confidenceLabel: ConfidenceLabel;
  criticalBlockedCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────

export function useExecutionIntelligence(tasks: TaskDTO[]): ExecutionIntelligence {
  return useMemo(() => {
    const now = new Date();
    const total = tasks.length;

    // ── Empty project ──────────────────────────────────────────────────────────
    if (total === 0) {
      return {
        totalTasks: 0, doneTasks: 0, inProgressTasks: 0, reviewTasks: 0,
        overdueTasks: 0, stalledTasks: 0, completionRate: 0,
        launchRiskProbability: 0, riskLevel: "low",
        riskFactors: [], executionConfidence: 100, confidenceLabel: "excellent",
        criticalBlockedCount: 0,
      };
    }

    // ── Basic task buckets ─────────────────────────────────────────────────────
    const done       = tasks.filter((t) => t.status === "DONE");
    const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS");
    const review     = tasks.filter((t) => t.status === "REVIEW");
    const completionRate = Math.round((done.length / total) * 100);

    // Overdue: non-done, non-review tasks whose due date is in the past.
    // REVIEW tasks are excluded — they are effectively in the final handoff
    // stage and should not inflate the overdue count.
    const overdue = tasks.filter(
      (t) =>
        t.status !== "DONE" &&
        t.status !== "REVIEW" &&
        t.dueDate != null &&
        new Date(t.dueDate) < now,
    );

    // Stalled: IN_PROGRESS or REVIEW tasks idle for 7+ days.
    // TODO tasks in backlog are NOT stalled — they're queued.
    const sevenDaysAgo = now.getTime() - 7 * 86_400_000;
    const stalled = tasks.filter(
      (t) =>
        (t.status === "IN_PROGRESS" || t.status === "REVIEW") &&
        new Date(t.updatedAt).getTime() < sevenDaysAgo,
    );

    // Critical blocked: urgent/high priority tasks that are overdue or stalled.
    const criticalBlocked = tasks.filter(
      (t) =>
        (t.priority === "URGENT" || t.priority === "HIGH") &&
        t.status !== "DONE" &&
        (overdue.some((o) => o.id === t.id) || stalled.some((s) => s.id === t.id)),
    );

    // ── Risk scoring: size-aware calibration ──────────────────────────────────
    // Small projects have proportionally larger ratios for a single overdue/stalled
    // task. A size factor damps this so scores stay realistic on small boards.
    const sizeFactor =
      total <= 6  ? 0.60
      : total <= 10 ? 0.75
      : total <= 15 ? 0.88
      : 1.0;

    const overdueContrib = total > 0
      ? Math.min(Math.round(Math.sqrt(overdue.length / total) * 30 * sizeFactor), 20)
      : 0;

    const stalledContrib = total > 0
      ? Math.min(Math.round(Math.sqrt(stalled.length / total) * 20 * sizeFactor), 12)
      : 0;

    const criticalContrib = Math.min(
      Math.round(criticalBlocked.length * 3.5 * sizeFactor),
      8,
    );

    // Active momentum: how much remaining work is actively in-flight.
    const remaining = total - done.length;
    const active    = inProgress.length + review.length;
    const momentumScore: number = (() => {
      if (remaining === 0) return 0; // project complete
      if (active === 0)    return remaining > 3 ? 10 : 5; // nothing moving
      const activeCoverage = active / remaining;
      return activeCoverage >= 0.3 ? 0 : activeCoverage >= 0.1 ? 3 : 6;
    })();

    const riskFactors: RiskFactor[] = [
      {
        label: "Overdue pressure",
        contribution: overdueContrib,
        description:
          overdue.length === 0
            ? "No tasks past due"
            : `${overdue.length} task${overdue.length === 1 ? "" : "s"} past due date`,
      },
      {
        label: "Stalled work",
        contribution: stalledContrib,
        description:
          stalled.length === 0
            ? "No active tasks idle"
            : `${stalled.length} in-progress task${stalled.length === 1 ? "" : "s"} idle 7+ days`,
      },
      {
        label: "Active momentum",
        contribution: momentumScore,
        description:
          remaining === 0
            ? "All tasks completed"
            : active === 0
              ? "No tasks currently in progress"
              : `${active} task${active === 1 ? "" : "s"} actively in flight`,
      },
      {
        label: "Priority items at risk",
        contribution: criticalContrib,
        description:
          criticalBlocked.length === 0
            ? "No priority items blocked"
            : `${criticalBlocked.length} urgent/high task${criticalBlocked.length === 1 ? "" : "s"} overdue or idle`,
      },
    ];

    const launchRiskProbability = Math.min(
      100,
      overdueContrib + stalledContrib + momentumScore + criticalContrib,
    );
    const riskLevel: RiskLevel =
      launchRiskProbability >= 65 ? "critical"
      : launchRiskProbability >= 40 ? "high"
      : launchRiskProbability >= 18 ? "medium"
      : "low";

    // ── Execution confidence ───────────────────────────────────────────────────
    // Blend: completion progress + active work bonus − risk penalty.
    // Base of 55 means a brand-new project starts "at-risk" and improves
    // as tasks complete and active work is underway.
    const completionScore = Math.round(completionRate * 0.35); // up to 35 pts
    const activeBonus     = active > 0 ? 5 : 0;
    const riskPenalty     = Math.round(launchRiskProbability * 0.55);
    const executionConfidence = Math.max(
      0,
      Math.min(100, 55 + completionScore + activeBonus - riskPenalty),
    );
    const confidenceLabel: ConfidenceLabel =
      executionConfidence >= 75 ? "excellent"
      : executionConfidence >= 55 ? "good"
      : executionConfidence >= 35 ? "at-risk"
      : "critical";

    return {
      totalTasks: total,
      doneTasks: done.length,
      inProgressTasks: inProgress.length,
      reviewTasks: review.length,
      overdueTasks: overdue.length,
      stalledTasks: stalled.length,
      completionRate,
      launchRiskProbability,
      riskLevel,
      riskFactors,
      executionConfidence,
      confidenceLabel,
      criticalBlockedCount: criticalBlocked.length,
    };
  }, [tasks]);
}
