"use client";

import { cn } from "@/lib/cn";
import type { ConfidenceLabel, RiskLevel } from "../hooks/use-execution-intelligence";

const RADIUS = 38;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface ExecutionScoreProps {
  confidence: number;
  label: ConfidenceLabel;
  riskLevel: RiskLevel;
  completionRate: number;
  doneTasks: number;
  totalTasks: number;
}

const LABEL_CONFIG: Record<
  ConfidenceLabel,
  { text: string; stroke: string; textClass: string; bgClass: string }
> = {
  excellent: {
    text: "Excellent",
    stroke: "stroke-emerald-500",
    textClass: "text-emerald-600 dark:text-emerald-400",
    bgClass: "bg-emerald-50 dark:bg-emerald-950/20",
  },
  good: {
    text: "Good",
    stroke: "stroke-blue-500",
    textClass: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-50 dark:bg-blue-950/20",
  },
  "at-risk": {
    text: "At Risk",
    stroke: "stroke-amber-500",
    textClass: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-50 dark:bg-amber-950/20",
  },
  critical: {
    text: "Critical",
    stroke: "stroke-red-500",
    textClass: "text-red-600 dark:text-red-400",
    bgClass: "bg-red-50 dark:bg-red-950/20",
  },
};

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5 text-center">
      <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
      <span className="text-base font-bold tabular-nums leading-none">{value}</span>
      {sub && <span className="text-[10px] text-muted-foreground/60">{sub}</span>}
    </div>
  );
}

export function ExecutionScore({
  confidence,
  label,
  completionRate,
  doneTasks,
  totalTasks,
}: ExecutionScoreProps) {
  const cfg = LABEL_CONFIG[label];
  const dashOffset = CIRCUMFERENCE * (1 - confidence / 100);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-4">
        {/* SVG confidence ring */}
        <div className="relative shrink-0">
          <svg width={96} height={96} className="-rotate-90">
            <circle
              cx={48} cy={48} r={RADIUS}
              fill="none" strokeWidth={8}
              className="stroke-muted"
            />
            <circle
              cx={48} cy={48} r={RADIUS}
              fill="none" strokeWidth={8}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              className={cn("transition-all duration-700", cfg.stroke)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-extrabold tabular-nums leading-none">{confidence}</span>
            <span className="text-[9px] font-medium text-muted-foreground">SCORE</span>
          </div>
        </div>

        {/* Label + description */}
        <div className="flex flex-1 flex-col gap-1.5">
          <span
            className={cn(
              "inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
              cfg.bgClass,
              cfg.textClass,
            )}
          >
            {cfg.text}
          </span>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Composite score based on overdue pressure, stall rate, active coverage, and priority health.
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/30 px-3 py-2.5">
        <Stat label="Complete" value={`${completionRate}%`} sub={`${doneTasks}/${totalTasks}`} />
        <Stat label="Remaining" value={`${totalTasks - doneTasks}`} sub="tasks left" />
        <Stat label="Score" value={`${confidence}`} sub="/ 100" />
      </div>
    </div>
  );
}
