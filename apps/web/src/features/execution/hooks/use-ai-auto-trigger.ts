"use client";

import { useMemo } from "react";
import type { ExecutionIntelligence } from "./use-execution-intelligence";

export interface TriggerCondition {
  id: string;
  label: string;
  description: string;
  severity: "warning" | "critical";
  triggered: boolean;
}

export interface AiTriggerState {
  conditions: TriggerCondition[];
  activeConditions: TriggerCondition[];
  hasActive: boolean;
  criticalCount: number;
}

/**
 * Derives which alert thresholds are currently met from execution intelligence.
 * Pure computation — no side effects.
 */
export function useAiAutoTrigger(intel: ExecutionIntelligence): AiTriggerState {
  return useMemo(() => {
    const conditions: TriggerCondition[] = [
      {
        id: "overdue",
        label: "Tasks past due",
        description:
          intel.overdueTasks === 1
            ? "1 task has passed its due date — review and reschedule if needed"
            : `${intel.overdueTasks} tasks have passed their due dates — consider rescheduling or reprioritizing`,
        severity: intel.overdueTasks >= 5 ? "critical" : "warning",
        triggered: intel.overdueTasks > 0,
      },
      {
        id: "critical_blocked",
        label: "Priority tasks need attention",
        description: `${intel.criticalBlockedCount} urgent or high-priority task${intel.criticalBlockedCount === 1 ? "" : "s"} ${intel.criticalBlockedCount === 1 ? "is" : "are"} overdue or stalled`,
        severity: intel.criticalBlockedCount >= 3 ? "critical" : "warning",
        triggered: intel.criticalBlockedCount > 0,
      },
      {
        id: "stalled",
        label: "In-progress work is idle",
        description: `${intel.stalledTasks} task${intel.stalledTasks === 1 ? "" : "s"} in progress ${intel.stalledTasks === 1 ? "has" : "have"} had no updates for 7+ days`,
        severity: intel.stalledTasks >= 4 ? "critical" : "warning",
        triggered: intel.stalledTasks >= 1,
      },
      {
        id: "high_risk",
        label: "Project risk score elevated",
        description: `Risk score at ${intel.launchRiskProbability}% — review blockers to identify the highest-impact actions`,
        severity: "critical",
        triggered: intel.riskLevel === "critical",
      },
    ];

    const activeConditions = conditions.filter((c) => c.triggered);

    return {
      conditions,
      activeConditions,
      hasActive: activeConditions.length > 0,
      criticalCount: activeConditions.filter((c) => c.severity === "critical").length,
    };
  }, [intel]);
}
