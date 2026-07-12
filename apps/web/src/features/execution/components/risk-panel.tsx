"use client";

import { AlertTriangle, CheckCircle2, ShieldAlert, ShieldCheck } from "lucide-react";

import { cn } from "@/lib/cn";
import type { RiskFactor, RiskLevel } from "../hooks/use-execution-intelligence";

const RISK_LEVEL_CONFIG: Record<
  RiskLevel,
  {
    label: string;
    icon: typeof ShieldCheck;
    ringClass: string;
    textClass: string;
    bgClass: string;
    borderClass: string;
  }
> = {
  low: {
    label: "Low Risk",
    icon: ShieldCheck,
    ringClass: "stroke-emerald-500",
    textClass: "text-emerald-600 dark:text-emerald-400",
    bgClass: "bg-emerald-50 dark:bg-emerald-950/20",
    borderClass: "border-emerald-200 dark:border-emerald-800/40",
  },
  medium: {
    label: "Medium Risk",
    icon: AlertTriangle,
    ringClass: "stroke-amber-500",
    textClass: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-50 dark:bg-amber-950/20",
    borderClass: "border-amber-200 dark:border-amber-800/40",
  },
  high: {
    label: "High Risk",
    icon: ShieldAlert,
    ringClass: "stroke-orange-500",
    textClass: "text-orange-600 dark:text-orange-400",
    bgClass: "bg-orange-50 dark:bg-orange-950/20",
    borderClass: "border-orange-200 dark:border-orange-800/40",
  },
  critical: {
    label: "Critical",
    icon: AlertTriangle,
    ringClass: "stroke-red-500",
    textClass: "text-red-600 dark:text-red-400",
    bgClass: "bg-red-50 dark:bg-red-950/20",
    borderClass: "border-red-200 dark:border-red-800/40",
  },
};

const FACTOR_BAR_COLOR = (contribution: number) =>
  contribution >= 15
    ? "bg-red-400/70"
    : contribution >= 6
      ? "bg-amber-400/55"
      : contribution > 0
        ? "bg-muted-foreground/25"
        : "bg-emerald-400/50";

const RADIUS = 30;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface RiskPanelProps {
  riskProbability: number;
  riskLevel: RiskLevel;
  riskFactors: RiskFactor[];
  overdueTasks: number;
  stalledTasks: number;
  criticalBlockedCount: number;
}

export function RiskPanel({
  riskProbability,
  riskLevel,
  riskFactors,
  overdueTasks,
  stalledTasks,
  criticalBlockedCount,
}: RiskPanelProps) {
  const cfg = RISK_LEVEL_CONFIG[riskLevel];
  const RiskIcon = cfg.icon;
  const dashOffset = CIRCUMFERENCE * (1 - riskProbability / 100);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-4">
        {/* Risk gauge */}
        <div className="relative shrink-0">
          <svg width={76} height={76} className="-rotate-90">
            <circle cx={38} cy={38} r={RADIUS} fill="none" strokeWidth={7} className="stroke-muted" />
            <circle
              cx={38}
              cy={38}
              r={RADIUS}
              fill="none"
              strokeWidth={7}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              className={cn("transition-all duration-700", cfg.ringClass)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-extrabold tabular-nums leading-none">
              {riskProbability}
            </span>
            <span className="text-[8px] font-medium text-muted-foreground">RISK %</span>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-1.5">
          <span
            className={cn(
              "inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
              cfg.bgClass,
              cfg.textClass,
            )}
          >
            <RiskIcon className="size-3" />
            {cfg.label}
          </span>

          {/* Impact summary */}
          <div className="flex flex-wrap gap-2 text-[10px]">
            {overdueTasks > 0 && (
              <span className="flex items-center gap-0.5 text-red-600 dark:text-red-400">
                <AlertTriangle className="size-2.5" />
                {overdueTasks} overdue
              </span>
            )}
            {stalledTasks > 0 && (
              <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="size-2.5" />
                {stalledTasks} stalled
              </span>
            )}
            {criticalBlockedCount > 0 && (
              <span className="flex items-center gap-0.5 text-orange-600 dark:text-orange-400">
                <ShieldAlert className="size-2.5" />
                {criticalBlockedCount} critical blocked
              </span>
            )}
            {overdueTasks === 0 && stalledTasks === 0 && criticalBlockedCount === 0 && (
              <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-2.5" />
                No critical issues
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Risk factor breakdown */}
      <div className="flex flex-col gap-2">
        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/55">
          Risk Factors
        </span>
        {riskFactors.map((factor) => (
          <div key={factor.label} className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-foreground/65">{factor.label}</span>
              <span className="truncate max-w-[140px] text-right text-[10px] text-muted-foreground/45">
                {factor.description}
              </span>
            </div>
            <div className="h-0.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  FACTOR_BAR_COLOR(factor.contribution),
                )}
                style={{ width: `${Math.min(100, factor.contribution * 2.5)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
