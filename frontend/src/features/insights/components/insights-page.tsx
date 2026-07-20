"use client";

import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Bot,
  Calendar,
  CheckCircle2,
  Clock,
  GitBranch,
  GitMerge,
  Layers,
  ListChecks,
  RefreshCw,
  Route,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { InsightType } from "@/lib/validators/insight";
import { DEEP_INSIGHT_TYPES } from "@/lib/validators/insight";
import type { DetectionResult } from "@/lib/validators/automation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { queryKeys } from "@/lib/query-keys";

import { insightApi } from "../api/insight.api";
import { automationApi } from "../api/automation.api";
import { useInsights } from "../hooks/use-insights";
import { useProjectHealth, useComputeHealth } from "../hooks/use-project-health";
import {
  InsightCard,
  parseInsightStatus,
  valueToSeverity,
  SEVERITY_CONFIG,
  type InsightConfig,
} from "./insight-card";

// ─── Insight configs ──────────────────────────────────────────────────────────

const CORE_CONFIGS: InsightConfig[] = [
  {
    type: "NEXT_TASK",
    title: "Next Best Task",
    description: "What should you work on right now?",
    icon: Target,
    accentClass: "text-blue-500",
    iconBgClass: "bg-blue-500/10",
  },
  {
    type: "OVERDUE_TASKS",
    title: "Overdue Tasks",
    description: "Tasks past their due date — and how to recover",
    icon: AlertTriangle,
    accentClass: "text-red-500",
    iconBgClass: "bg-red-500/10",
  },
  {
    type: "DAILY_SUMMARY",
    title: "Today's Summary",
    description: "What happened today and what to focus on next",
    icon: Calendar,
    accentClass: "text-orange-500",
    iconBgClass: "bg-orange-500/10",
  },
  {
    type: "WORKLOAD_PRIORITY",
    title: "Priority Order",
    description: "Which tasks matter most — in plain language",
    icon: ListChecks,
    accentClass: "text-violet-500",
    iconBgClass: "bg-violet-500/10",
  },
  {
    type: "BLOCKER_DETECTION",
    title: "Blockers",
    description: "Things slowing you down and how to fix them",
    icon: Layers,
    accentClass: "text-yellow-500",
    iconBgClass: "bg-yellow-500/10",
  },
  {
    type: "SPRINT_IMPROVEMENTS",
    title: "Work Better",
    description: "Simple habits to get more done each week",
    icon: TrendingUp,
    accentClass: "text-green-500",
    iconBgClass: "bg-green-500/10",
  },
  {
    type: "WEEKLY_SUMMARY",
    title: "This Week",
    description: "What you accomplished and what comes next",
    icon: CheckCircle2,
    accentClass: "text-cyan-500",
    iconBgClass: "bg-cyan-500/10",
  },
];

const AUTOMATION_CONFIGS: InsightConfig[] = [
  {
    type: "OVERDUE_RECOVERY",
    title: "Overdue Recovery Plan",
    description: "AI-generated plan to recover from overdue task buildup",
    icon: Clock,
    accentClass: "text-red-500",
    iconBgClass: "bg-red-500/10",
  },
  {
    type: "INACTIVE_PROJECT",
    title: "Inactivity Alert",
    description: "Project has gone quiet — get it back on track",
    icon: Activity,
    accentClass: "text-orange-500",
    iconBgClass: "bg-orange-500/10",
  },
  {
    type: "BLOCKED_WORKFLOW",
    title: "Blocked Workflow",
    description: "Too many tasks stuck in review or waiting",
    icon: AlertCircle,
    accentClass: "text-yellow-500",
    iconBgClass: "bg-yellow-500/10",
  },
  {
    type: "PRODUCTIVITY_SLOWDOWN",
    title: "Productivity Slowdown",
    description: "Completion rate dropped — here's why and what to do",
    icon: TrendingDown,
    accentClass: "text-amber-500",
    iconBgClass: "bg-amber-500/10",
  },
  {
    type: "SPRINT_RISK",
    title: "Sprint at Risk",
    description: "Current sprint may miss its targets",
    icon: AlertTriangle,
    accentClass: "text-rose-500",
    iconBgClass: "bg-rose-500/10",
  },
  {
    type: "OVERLOAD_WARNING",
    title: "Team Overload",
    description: "Someone has too many tasks assigned",
    icon: Users,
    accentClass: "text-purple-500",
    iconBgClass: "bg-purple-500/10",
  },
  {
    type: "STALE_CONTENT",
    title: "Stale Content",
    description: "Outdated plans or conversations that need a refresh",
    icon: RefreshCw,
    accentClass: "text-slate-500",
    iconBgClass: "bg-slate-500/10",
  },
];

const DEEP_CONFIGS: InsightConfig[] = [
  {
    type: "DEPENDENCY_ANALYSIS",
    title: "Dependency Map",
    description: "Infers which tasks block other tasks — no explicit links needed",
    icon: GitBranch,
    accentClass: "text-indigo-500",
    iconBgClass: "bg-indigo-500/10",
  },
  {
    type: "BLOCKER_CHAIN",
    title: "Blocker Chains",
    description: "Detects cascade failures where one stalled task blocks a chain",
    icon: GitMerge,
    accentClass: "text-red-600",
    iconBgClass: "bg-red-600/10",
  },
  {
    type: "SPRINT_FORECAST",
    title: "Sprint Forecast",
    description: "Predicts which tasks will slip based on current velocity",
    icon: TrendingDown,
    accentClass: "text-orange-500",
    iconBgClass: "bg-orange-500/10",
  },
  {
    type: "DELAY_IMPACT",
    title: "Delay Impact",
    description: "Estimates cascade damage if critical tasks miss their deadlines",
    icon: AlertCircle,
    accentClass: "text-rose-500",
    iconBgClass: "bg-rose-500/10",
  },
  {
    type: "WORKLOAD_IMBALANCE",
    title: "Workload Imbalance",
    description: "Detects who is overloaded, underloaded, or missing critical assignments",
    icon: Users,
    accentClass: "text-violet-500",
    iconBgClass: "bg-violet-500/10",
  },
  {
    type: "STALL_ANALYSIS",
    title: "Stall Analysis",
    description: "Deep per-task diagnosis of every task idle for 3+ days",
    icon: Clock,
    accentClass: "text-amber-500",
    iconBgClass: "bg-amber-500/10",
  },
  {
    type: "CRITICAL_PATH",
    title: "Critical Path",
    description: "Identifies the task sequence whose delay would most push out the end date",
    icon: Route,
    accentClass: "text-cyan-600",
    iconBgClass: "bg-cyan-600/10",
  },
];

const ALL_CONFIGS = [...CORE_CONFIGS, ...AUTOMATION_CONFIGS, ...DEEP_CONFIGS];

// ─── Project health widget ────────────────────────────────────────────────────

interface HealthWidgetProps {
  projectId: string;
}

function HealthScoreRing({ score }: { score: number }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const fill = circ * (score / 100);
  const color = score >= 75 ? "#22c55e" : score >= 50 ? "#eab308" : "#ef4444";

  return (
    <svg width={52} height={52} viewBox="0 0 52 52" className="shrink-0 -rotate-90">
      <circle
        cx={26}
        cy={26}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={5}
        className="text-muted/40"
      />
      <circle
        cx={26}
        cy={26}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={5}
        strokeDasharray={`${fill} ${circ - fill}`}
        strokeLinecap="round"
      />
    </svg>
  );
}

function ProjectHealthWidget({ projectId }: HealthWidgetProps) {
  const healthQuery = useProjectHealth(projectId);
  const computeHealth = useComputeHealth(projectId);

  const health = healthQuery.data;

  const handleCompute = () => {
    computeHealth.mutate(undefined, {
      onError: () => toast.error("Could not compute health score"),
    });
  };

  if (healthQuery.isLoading) {
    return (
      <div className="border-border bg-card flex items-center gap-3 rounded-xl border p-4">
        <div className="bg-muted size-13 animate-pulse rounded-full" />
        <div className="flex flex-col gap-1.5">
          <div className="bg-muted h-4 w-24 animate-pulse rounded" />
          <div className="bg-muted h-3 w-32 animate-pulse rounded" />
        </div>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="border-border bg-card flex items-center gap-3 rounded-xl border border-dashed p-4">
        <div className="bg-muted/50 flex size-13 items-center justify-center rounded-full">
          <Activity className="text-muted-foreground/60 size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Project Health</p>
          <p className="text-muted-foreground text-[11px]">Not yet computed</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCompute}
          disabled={computeHealth.isPending}
          className="shrink-0 gap-1.5 text-xs"
        >
          <Zap className="size-3" />
          Compute
        </Button>
      </div>
    );
  }

  const score = Math.round(health.score);
  const label = score >= 75 ? "Healthy" : score >= 50 ? "Needs attention" : "At risk";
  const labelColor =
    score >= 75
      ? "text-green-600 dark:text-green-400"
      : score >= 50
        ? "text-yellow-600 dark:text-yellow-400"
        : "text-red-600 dark:text-red-400";

  // Weights match the backend scoring formula: 0.35 / 0.30 / 0.20 / 0.15
  const dims = [
    {
      label: "Task completion",
      value: health.breakdown.taskCompletion,
      weight: 35,
      tooltip: `${Math.round(health.breakdown.taskCompletion)}% of tasks are marked done. Contributes 35% to the score.`,
    },
    {
      label: "Overdue impact",
      value: health.breakdown.overdueImpact,
      weight: 30,
      tooltip: `Penalty from overdue tasks. 100 = none overdue, lower = more overdue. Contributes 30% to the score.`,
    },
    {
      label: "Activity level",
      value: health.breakdown.activityLevel,
      weight: 20,
      tooltip: `${Math.round(health.breakdown.activityLevel)}% of tasks were updated in the last 7 days. Contributes 20% to the score.`,
    },
    {
      label: "Blocker risk",
      value: health.breakdown.blockerCount,
      weight: 15,
      tooltip: `Penalty from tasks stuck in review (2+ days) or frozen in-progress (3+ days). 100 = no blockers. Contributes 15% to the score.`,
    },
  ];

  // Plain-English reason for the score
  const explanation = (() => {
    const { taskCompletion, overdueImpact, activityLevel, blockerCount } = health.breakdown;
    const issues: string[] = [];
    const strengths: string[] = [];

    if (taskCompletion >= 75) strengths.push(`strong completion (${Math.round(taskCompletion)}%)`);
    else if (taskCompletion < 40)
      issues.push(`low completion rate (${Math.round(taskCompletion)}%)`);

    if (overdueImpact >= 90) strengths.push("no overdue tasks");
    else if (overdueImpact < 60) issues.push("overdue tasks creating risk");
    else if (overdueImpact < 80) issues.push("some overdue tasks");

    if (activityLevel >= 70) strengths.push("active this week");
    else if (activityLevel < 40) issues.push("low activity in last 7 days");

    if (blockerCount >= 85) strengths.push("no blockers");
    else if (blockerCount < 60) issues.push("tasks stuck in review or idle");
    else if (blockerCount < 80) issues.push("some tasks stalled");

    if (issues.length === 0) return `All dimensions healthy — ${strengths.slice(0, 2).join(", ")}.`;
    if (strengths.length === 0) return `Score reduced by: ${issues.join("; ")}.`;
    return `Strengths: ${strengths.join(", ")}. Issues: ${issues.join("; ")}.`;
  })();

  return (
    <div className="border-border bg-card rounded-xl border p-4">
      <div className="flex items-center gap-4">
        <div className="relative flex shrink-0 items-center justify-center">
          <HealthScoreRing score={score} />
          <span className="absolute text-sm font-bold tabular-nums">{score}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">Project Health</p>
            <span className={cn("text-xs font-medium", labelColor)}>{label}</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
            {dims.map((d) => (
              <div key={d.label} className="flex items-center gap-1.5" title={d.tooltip}>
                <div className="bg-muted h-1 w-14 shrink-0 overflow-hidden rounded-full">
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width] duration-500",
                      SEVERITY_CONFIG[valueToSeverity(d.value)].dotClass,
                    )}
                    style={{ width: `${d.value}%` }}
                  />
                </div>
                <span className="text-muted-foreground flex-1 truncate text-[10px]">{d.label}</span>
                <span
                  className={cn(
                    "shrink-0 text-[10px] font-semibold",
                    SEVERITY_CONFIG[valueToSeverity(d.value)].textClass,
                  )}
                >
                  {SEVERITY_CONFIG[valueToSeverity(d.value)].label}
                  <span className="text-muted-foreground/50 ml-1 font-normal">
                    {Math.round(d.value)}%
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCompute}
          disabled={computeHealth.isPending}
          className="h-7 w-7 shrink-0 p-0 opacity-0 group-hover:opacity-100 sm:opacity-100"
          title="Recompute health score"
        >
          <RefreshCw className={cn("size-3.5", computeHealth.isPending && "animate-spin")} />
        </Button>
      </div>

      {/* AI reasoning behind the score */}
      <div className="bg-muted/30 mt-3 flex items-start gap-1.5 rounded-lg px-3 py-2">
        <Activity className="text-muted-foreground/60 mt-0.5 size-3 shrink-0" />
        <p className="text-muted-foreground/70 text-[11px] leading-relaxed">{explanation}</p>
      </div>

      {health.updatedAt && (
        <p className="text-muted-foreground/40 mt-2 text-[10px]">
          Computed {new Date(health.updatedAt).toLocaleString()} · Weighted: completion 35% ·
          overdue 30% · activity 20% · blockers 15%
        </p>
      )}
    </div>
  );
}

// ─── Auto-detect button ───────────────────────────────────────────────────────

interface AutoDetectProps {
  projectId: string;
  onDetected: (detections: DetectionResult[]) => void;
}

function AutoDetectButton({ projectId, onDetected }: AutoDetectProps) {
  const [isDetecting, setIsDetecting] = useState(false);

  const handleDetect = async () => {
    setIsDetecting(true);
    try {
      const result = await automationApi.detectTriggers(projectId);
      const active = result.detections.filter((d) => d.shouldGenerate);
      if (active.length === 0) {
        toast.success("No automation triggers detected — project looks good!");
      } else {
        toast.info(`${active.length} trigger${active.length === 1 ? "" : "s"} detected`);
        onDetected(active);
      }
    } catch {
      toast.error("Detection failed — try again");
    } finally {
      setIsDetecting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDetect}
      disabled={isDetecting}
      className="gap-1.5 text-xs"
    >
      <Zap className={cn("size-3.5", isDetecting && "animate-pulse")} />
      {isDetecting ? "Detecting…" : "Auto-Detect"}
    </Button>
  );
}

// ─── Detection alert banner ───────────────────────────────────────────────────

function DetectionBanner({
  detections,
  configs,
  onGenerate,
  onDismiss,
}: {
  detections: DetectionResult[];
  configs: InsightConfig[];
  onGenerate: () => void;
  onDismiss: () => void;
}) {
  const critical = detections.filter((d) => d.severity === "CRITICAL");

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-800/40 dark:bg-amber-950/20">
      <div className="flex items-start gap-3">
        <Zap className="mt-0.5 size-4 shrink-0 text-amber-500" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            {detections.length} issue{detections.length === 1 ? "" : "s"} detected
            {critical.length > 0 && ` — ${critical.length} critical`}
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {detections.map((d) => {
              const cfg = configs.find((c) => c.type === d.type);
              return (
                <span
                  key={d.type}
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                    d.severity === "CRITICAL"
                      ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400",
                  )}
                >
                  {cfg?.title ?? d.type}
                </span>
              );
            })}
          </div>
          {detections[0] && (
            <p className="mt-1.5 text-[11px] text-amber-700/70 dark:text-amber-400/60">
              {detections[0].triggerReason}
              {detections.length > 1 && ` +${detections.length - 1} more`}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-[10px] text-amber-600/60 transition-colors hover:text-amber-600 dark:text-amber-400/50 dark:hover:text-amber-400"
        >
          dismiss
        </button>
      </div>
      <div className="flex gap-2">
        <Button size="sm" className="gap-1.5 text-xs" onClick={onGenerate}>
          <Sparkles className="size-3" />
          Generate all
        </Button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

interface InsightsPageProps {
  projectId: string;
}

export function InsightsPage({ projectId }: InsightsPageProps) {
  const insightsQuery = useInsights(projectId);
  const queryClient = useQueryClient();
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState(0);
  const [detections, setDetections] = useState<DetectionResult[]>([]);

  const insights = insightsQuery.data ?? [];
  const insightMap = Object.fromEntries(insights.map((i) => [i.type, i])) as Partial<
    Record<InsightType, (typeof insights)[number]>
  >;

  const generatedCount = insights.filter((i) => CORE_CONFIGS.some((c) => c.type === i.type)).length;
  const totalCount = CORE_CONFIGS.length;
  const allGenerated = generatedCount === totalCount;
  const deepGenerated = insights.filter((i) =>
    (DEEP_INSIGHT_TYPES as string[]).includes(i.type),
  ).length;

  const criticalInsights = insights.filter((i) => parseInsightStatus(i.content) === "CRITICAL");
  const criticalLabels = criticalInsights.map(
    (i) => ALL_CONFIGS.find((c) => c.type === i.type)?.title ?? i.type,
  );

  const activeAutomationInsights = insights.filter(
    (i) => AUTOMATION_CONFIGS.some((c) => c.type === i.type) && !i.dismissedAt,
  );

  const handleRefreshAll = useCallback(async () => {
    if (isRefreshingAll) return;
    setIsRefreshingAll(true);
    setRefreshProgress(0);

    let successCount = 0;
    for (let i = 0; i < CORE_CONFIGS.length; i++) {
      const config = CORE_CONFIGS[i]!;
      try {
        // force=true: Refresh All always regenerates fresh AI output
        for await (const event of insightApi.generateInsight(projectId, config.type, true)) {
          if (event.type === "done") successCount++;
          else if (event.type === "error") toast.error(`${config.title}: ${event.message}`);
        }
      } catch {
        toast.error(`${config.title}: Connection failed`);
      }
      setRefreshProgress(i + 1);
    }

    await queryClient.invalidateQueries({ queryKey: queryKeys.insight.byProject(projectId) });
    if (successCount > 0) {
      toast.success(`${successCount} insight${successCount === 1 ? "" : "s"} refreshed`);
    }
    setIsRefreshingAll(false);
    setRefreshProgress(0);
  }, [isRefreshingAll, projectId, queryClient]);

  const handleGenerateDetected = useCallback(async () => {
    const toGenerate = detections.filter((d) => d.shouldGenerate);
    let successCount = 0;
    for (const detection of toGenerate) {
      const config = AUTOMATION_CONFIGS.find((c) => c.type === detection.type);
      if (!config) continue;
      try {
        // Auto-detect generates fresh AI output (force=true)
        for await (const event of insightApi.generateInsight(projectId, detection.type, true)) {
          if (event.type === "done") successCount++;
          else if (event.type === "error") toast.error(`${config.title}: ${event.message}`);
        }
      } catch {
        toast.error(`${config?.title}: Connection failed`);
      }
    }
    await queryClient.invalidateQueries({ queryKey: queryKeys.insight.byProject(projectId) });
    if (successCount > 0) {
      toast.success(`${successCount} automation insight${successCount === 1 ? "" : "s"} generated`);
    }
    setDetections([]);
  }, [detections, projectId, queryClient]);

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      {/* ── Page header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 flex size-8 items-center justify-center rounded-lg">
              <Bot className="text-primary size-4" />
            </div>
            <h1 className="text-base font-semibold sm:text-lg">AI Execution Assistant</h1>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Plain-English insights about your project — no jargon, just clear advice.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {/* Progress pill */}
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs",
              allGenerated
                ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800/40 dark:bg-green-950/20 dark:text-green-400"
                : "border-border bg-muted/40 text-muted-foreground",
            )}
          >
            {allGenerated ? (
              <CheckCircle2 className="size-3 shrink-0" />
            ) : (
              <Sparkles className="text-primary size-3 shrink-0" />
            )}
            <span>
              {generatedCount}/{totalCount} ready
            </span>
          </div>

          <AutoDetectButton projectId={projectId} onDetected={setDetections} />

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            disabled={isRefreshingAll}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={cn("size-3.5", isRefreshingAll && "animate-spin")} />
            <span>
              {isRefreshingAll ? `Refreshing ${refreshProgress}/${totalCount}…` : "Refresh all"}
            </span>
          </Button>
        </div>
      </div>

      {/* ── Project health widget ── */}
      <div className="group">
        <ProjectHealthWidget projectId={projectId} />
      </div>

      {/* ── Detection banner ── */}
      {detections.length > 0 && (
        <DetectionBanner
          detections={detections}
          configs={AUTOMATION_CONFIGS}
          onGenerate={handleGenerateDetected}
          onDismiss={() => setDetections([])}
        />
      )}

      {/* ── Critical alerts banner ── */}
      {criticalInsights.length > 0 && !insightsQuery.isLoading && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 dark:border-red-900/40 dark:bg-red-950/20">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              {criticalInsights.length === 1
                ? "1 critical issue"
                : `${criticalInsights.length} critical issues`}{" "}
              detected
            </p>
            <p className="mt-0.5 text-xs text-red-600/80 dark:text-red-400/70">
              {criticalLabels.join(" · ")} — check these cards first
            </p>
          </div>
        </div>
      )}

      {/* ── Quick tip banner ── */}
      {generatedCount === 0 && !insightsQuery.isLoading && (
        <div className="border-primary/20 bg-primary/5 flex items-start gap-3 rounded-xl border px-4 py-3">
          <Zap className="text-primary mt-0.5 size-4 shrink-0" />
          <div>
            <p className="text-sm font-medium">Get your first insight</p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Click any card below to run an AI analysis. Each takes about 5 seconds.
            </p>
          </div>
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {insightsQuery.isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="bg-muted h-40 animate-pulse rounded-xl" />
          ))}
        </div>
      )}

      {/* ── Core insight cards ── */}
      {!insightsQuery.isLoading && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <div className="flex size-5 items-center justify-center rounded bg-primary/10">
              <Sparkles className="text-primary size-3" />
            </div>
            <h2 className="text-xs font-semibold tracking-wide uppercase text-foreground">
              Core Insights
            </h2>
            <span className="text-[10px] text-muted-foreground/50 ml-1">
              — daily awareness
            </span>
            <span className="ml-auto text-[10px] text-muted-foreground/50">
              {generatedCount}/{totalCount} ready
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {CORE_CONFIGS.map((config) => (
              <InsightCard
                key={config.type}
                config={config}
                savedInsight={insightMap[config.type] ?? null}
                projectId={projectId}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Automation alert cards ── */}
      {!insightsQuery.isLoading && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <div className="flex size-5 items-center justify-center rounded bg-amber-500/10">
              <Zap className="size-3 text-amber-500" />
            </div>
            <h2 className="text-xs font-semibold tracking-wide uppercase text-foreground">
              Automation Alerts
            </h2>
            {activeAutomationInsights.length > 0 && (
              <span className="flex size-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white">
                {activeAutomationInsights.length}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground/50 ml-1">
              — auto-detected issues
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {AUTOMATION_CONFIGS.map((config) => (
              <InsightCard
                key={config.type}
                config={config}
                savedInsight={insightMap[config.type] ?? null}
                projectId={projectId}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Deep intelligence cards ── */}
      {!insightsQuery.isLoading && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <div className="flex size-5 items-center justify-center rounded bg-indigo-500/10">
              <GitBranch className="size-3 text-indigo-500" />
            </div>
            <h2 className="text-xs font-semibold tracking-wide uppercase text-foreground">
              Deep Intelligence
            </h2>
            <span className="text-[10px] text-muted-foreground/50 ml-1">
              — dependency chains · cascade risk · critical path
            </span>
            {deepGenerated > 0 && (
              <span className="ml-auto text-[10px] text-muted-foreground/50">
                {deepGenerated}/{DEEP_CONFIGS.length} ready
              </span>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {DEEP_CONFIGS.map((config) => (
              <InsightCard
                key={config.type}
                config={config}
                savedInsight={insightMap[config.type] ?? null}
                projectId={projectId}
              />
            ))}
          </div>
        </section>
      )}

      <p className="text-muted-foreground/40 text-center text-[11px]">
        Insights update based on your task board. Use Auto-Detect to scan for issues automatically.
      </p>
    </div>
  );
}
