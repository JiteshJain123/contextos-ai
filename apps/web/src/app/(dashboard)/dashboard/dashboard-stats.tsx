"use client";

import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Bot,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  FolderKanban,
  History,
  LayoutList,
  Lightbulb,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "@/lib/cn";
import { useDashboardStats, type RecentTask } from "@/features/project/hooks/use-dashboard-stats";

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type Severity = "critical" | "warning" | "info" | "success";

interface AiInsight {
  id: string;
  severity: Severity;
  icon: React.ElementType;
  title: string;
  description: string;
  action?: { label: string; href: string };
}

// â”€â”€ Insight engine (rule-based, pure function) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function deriveInsights(stats: {
  tasksByStatus: Record<"TODO" | "IN_PROGRESS" | "REVIEW" | "DONE", number>;
  overdueCount: number;
  avgHealthScore: number;
  overdueMilestoneCount: number;
  totalTasks: number;
  completionPct: number;
}): AiInsight[] {
  const {
    tasksByStatus,
    overdueCount,
    avgHealthScore,
    overdueMilestoneCount,
    totalTasks,
    completionPct,
  } = stats;

  const insights: AiInsight[] = [];

  if (totalTasks === 0) {
    insights.push({
      id: "no-tasks",
      severity: "info",
      icon: Lightbulb,
      title: "Get started with your first project",
      description:
        "Create a project and add tasks to start tracking your work. AI insights will appear as data builds up.",
      action: { label: "Create project", href: "/projects" },
    });
    return insights;
  }

  // Overdue tasks
  if (overdueCount >= 5) {
    insights.push({
      id: "many-overdue",
      severity: "critical",
      icon: AlertCircle,
      title: `${overdueCount} tasks are past their due date`,
      description:
        "This is significantly impacting your project health. Review and re-prioritise or reschedule these tasks immediately.",
      action: { label: "Open projects", href: "/projects" },
    });
  } else if (overdueCount > 0) {
    insights.push({
      id: "some-overdue",
      severity: "warning",
      icon: Clock,
      title: `${overdueCount} task${overdueCount === 1 ? " is" : "s are"} overdue`,
      description:
        "Address these soon to prevent them from piling up. Focus on the highest-priority items first.",
      action: { label: "Open projects", href: "/projects" },
    });
  }

  // Overdue milestones
  if (overdueMilestoneCount > 0) {
    insights.push({
      id: "milestone-delay",
      severity: overdueMilestoneCount >= 2 ? "critical" : "warning",
      icon: AlertTriangle,
      title: `${overdueMilestoneCount} milestone${overdueMilestoneCount === 1 ? "" : "s"} missed`,
      description:
        "Missed milestones indicate timeline slippage. Review your project plan and update target dates to reflect current reality.",
      action: { label: "View calendar", href: "/projects" },
    });
  }

  // Low completion rate
  if (completionPct < 15 && totalTasks >= 5) {
    insights.push({
      id: "low-completion",
      severity: "warning",
      icon: TrendingDown,
      title: "Completion rate is very low",
      description: `Only ${completionPct}% of tasks are done. Consider breaking large tasks into smaller actionable items, or move blocked work to REVIEW.`,
    });
  } else if (completionPct >= 80) {
    insights.push({
      id: "high-completion",
      severity: "success",
      icon: Trophy,
      title: `${completionPct}% completion â€” outstanding progress`,
      description:
        "You're in the final stretch. Keep the momentum and close out the remaining tasks.",
    });
  }

  // High WIP (Work In Progress)
  const wipCount = tasksByStatus.IN_PROGRESS + tasksByStatus.REVIEW;
  const wipRatio = totalTasks > 0 ? wipCount / totalTasks : 0;
  if (wipRatio > 0.5 && wipCount >= 6) {
    insights.push({
      id: "high-wip",
      severity: "warning",
      icon: Zap,
      title: `High work-in-progress (${wipCount} tasks active)`,
      description:
        "Context-switching across too many tasks reduces throughput. Try finishing in-progress work before pulling in new tasks.",
    });
  }

  // Todo backlog growing
  const todoRatio = totalTasks > 0 ? tasksByStatus.TODO / totalTasks : 0;
  if (todoRatio > 0.6 && tasksByStatus.TODO >= 10) {
    insights.push({
      id: "large-backlog",
      severity: "info",
      icon: LayoutList,
      title: `Large backlog â€” ${tasksByStatus.TODO} tasks waiting`,
      description:
        "A big todo pile can create overwhelm. Use the AI Breakdown tool to prioritise and schedule work into sprints.",
      action: { label: "Open projects", href: "/projects" },
    });
  }

  // Low health
  if (avgHealthScore > 0 && avgHealthScore < 40) {
    insights.push({
      id: "low-health",
      severity: "critical",
      icon: AlertCircle,
      title: `Project health is critical (score ${avgHealthScore}/100)`,
      description:
        "Multiple factors are dragging health down â€” likely a combination of overdue tasks, stalled reviews, and low activity. Visit each project's Insights tab for a full breakdown.",
    });
  } else if (avgHealthScore >= 40 && avgHealthScore < 60) {
    insights.push({
      id: "mid-health",
      severity: "warning",
      icon: AlertTriangle,
      title: `Project health needs attention (score ${avgHealthScore}/100)`,
      description:
        "There's room to improve. Check for tasks stuck in review and ensure in-progress work is moving forward.",
    });
  } else if (avgHealthScore >= 80) {
    insights.push({
      id: "great-health",
      severity: "success",
      icon: CheckCircle2,
      title: `Excellent project health (score ${avgHealthScore}/100)`,
      description:
        "Your projects are in great shape. Completion is strong, overdue count is low, and work is moving smoothly.",
    });
  }

  // All good, no issues
  if (insights.length === 0) {
    insights.push({
      id: "all-clear",
      severity: "success",
      icon: CheckCircle2,
      title: "Everything looks good",
      description:
        "No outstanding issues detected. Keep up the pace and check back after your next sprint.",
    });
  }

  return insights.slice(0, 5);
}

// â”€â”€ Severity styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const SEVERITY_STYLES: Record<
  Severity,
  { bar: string; icon: string; badge: string; badgeText: string }
> = {
  critical: {
    bar: "bg-red-500",
    icon: "text-red-500",
    badge: "bg-red-500/10 dark:bg-red-500/15",
    badgeText: "text-red-600 dark:text-red-400",
  },
  warning: {
    bar: "bg-amber-500",
    icon: "text-amber-500",
    badge: "bg-amber-500/10 dark:bg-amber-500/15",
    badgeText: "text-amber-600 dark:text-amber-400",
  },
  info: {
    bar: "bg-blue-500",
    icon: "text-blue-500",
    badge: "bg-blue-500/10 dark:bg-blue-500/15",
    badgeText: "text-blue-600 dark:text-blue-400",
  },
  success: {
    bar: "bg-emerald-500",
    icon: "text-emerald-500",
    badge: "bg-emerald-500/10 dark:bg-emerald-500/15",
    badgeText: "text-emerald-600 dark:text-emerald-400",
  },
};

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Critical",
  warning: "Warning",
  info: "Info",
  success: "Good",
};

// â”€â”€ Health score ring â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function HealthRing({ score }: { score: number }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const filled = circumference * (score / 100);
  const color =
    score === 0
      ? "#94a3b8"
      : score >= 75
        ? "#10b981"
        : score >= 50
          ? "#f59e0b"
          : "#ef4444";

  return (
    <svg width="48" height="48" viewBox="0 0 48 48" className="-rotate-90">
      <circle cx="24" cy="24" r={radius} fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/30" />
      <circle
        cx="24"
        cy="24"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeDasharray={`${filled} ${circumference - filled}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.7s ease-out" }}
      />
    </svg>
  );
}

// â”€â”€ Metric card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  isLoading,
  href,
  extra,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent: "default" | "success" | "warning" | "danger" | "primary" | "blue";
  isLoading: boolean;
  href?: string;
  extra?: React.ReactNode;
}) {
  const accentMap = {
    default: "text-muted-foreground",
    success: "text-emerald-500",
    warning: "text-amber-500",
    danger: "text-red-500",
    primary: "text-primary",
    blue: "text-blue-500",
  };

  const bgMap = {
    default: "bg-muted/20",
    success: "bg-emerald-500/10",
    warning: "bg-amber-500/10",
    danger: "bg-red-500/10",
    primary: "bg-primary/10",
    blue: "bg-blue-500/10",
  };

  const inner = (
    <div
      className={cn(
        "group relative flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-all duration-200",
        href && "cursor-pointer hover:border-primary/20 hover:shadow-md hover:-translate-y-0.5",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className={cn("flex size-9 items-center justify-center rounded-lg", bgMap[accent])}>
          <Icon className={cn("size-4.5", accentMap[accent])} aria-hidden="true" />
        </div>
        {extra}
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {isLoading ? (
          <div className="mt-1.5 h-7 w-16 animate-pulse rounded-md bg-muted" />
        ) : (
          <p className="mt-0.5 text-2xl font-bold tracking-tight tabular-nums">{value}</p>
        )}
        {sub && !isLoading && (
          <p className="mt-0.5 text-[11px] text-muted-foreground/60">{sub}</p>
        )}
      </div>
      {href && (
        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/20 transition-all group-hover:text-muted-foreground/50 group-hover:translate-x-0.5" />
      )}
    </div>
  );

  return href ? <Link href={href as never}>{inner}</Link> : inner;
}

// â”€â”€ Status donut â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const STATUS_META = [
  { key: "DONE" as const, label: "Done", hex: "#10b981", tailwind: "bg-emerald-500" },
  { key: "IN_PROGRESS" as const, label: "In Progress", hex: "#3b82f6", tailwind: "bg-blue-500" },
  { key: "REVIEW" as const, label: "Review", hex: "#8b5cf6", tailwind: "bg-violet-500" },
  { key: "TODO" as const, label: "To Do", hex: "#94a3b8", tailwind: "bg-slate-400" },
];

function StatusDonut({
  tasksByStatus,
  isLoading,
}: {
  tasksByStatus: Record<"TODO" | "IN_PROGRESS" | "REVIEW" | "DONE", number>;
  isLoading: boolean;
}) {
  const total = Object.values(tasksByStatus).reduce((a, b) => a + b, 0);
  const donePct = total > 0 ? Math.round((tasksByStatus.DONE / total) * 100) : 0;

  const chartData = STATUS_META.map((s) => ({
    name: s.label,
    value: tasksByStatus[s.key],
    hex: s.hex,
  })).filter((d) => d.value > 0);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 h-full">
      <div className="flex items-center gap-2">
        <BarChart3 className="size-3.5 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Task Distribution</h2>
        {!isLoading && total > 0 && (
          <span className="ml-auto text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            {donePct}% done
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-6">
          <div className="size-28 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-2.5">
            {STATUS_META.map((s) => (
              <div key={s.key} className="flex items-center gap-2">
                <div className="size-2 animate-pulse rounded-full bg-muted" />
                <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      ) : total === 0 ? (
        <div className="flex flex-1 items-center justify-center py-8">
          <p className="text-sm text-muted-foreground">No tasks yet.</p>
        </div>
      ) : (
        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            <PieChart width={120} height={120}>
              <Pie
                data={chartData}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={32}
                outerRadius={56}
                paddingAngle={2}
                startAngle={90}
                endAngle={-270}
                strokeWidth={0}
                animationDuration={700}
                animationEasing="ease-out"
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.hex} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v) => {
                  const n = Number(v ?? 0);
                  return [`${n} task${n === 1 ? "" : "s"}`, ""] as [string, string];
                }}
                contentStyle={{
                  fontSize: "11px",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))",
                  color: "hsl(var(--foreground))",
                }}
                itemStyle={{ margin: 0 }}
              />
            </PieChart>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold tabular-nums">{total}</span>
              <span className="text-[9px] text-muted-foreground">total</span>
            </div>
          </div>

          <div className="flex-1 space-y-2">
            {STATUS_META.map((s) => {
              const count = tasksByStatus[s.key];
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={s.key} className="flex items-center gap-2">
                  <span className={cn("size-2 shrink-0 rounded-full", s.tailwind)} />
                  <span className="flex-1 text-xs text-muted-foreground">{s.label}</span>
                  <span className="text-xs font-semibold tabular-nums">{count}</span>
                  <span className="w-7 text-right text-[10px] tabular-nums text-muted-foreground/50">
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// â”€â”€ Completion trend chart â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function CompletionTrend({
  data,
  isLoading,
}: {
  data: Array<{ label: string; completed: number }>;
  isLoading: boolean;
}) {
  const hasTrend = data.some((d) => d.completed > 0);
  const maxVal = Math.max(...data.map((d) => d.completed), 1);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 h-full">
      <div className="flex items-center gap-2">
        <TrendingUp className="size-3.5 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Completion Trend</h2>
        <span className="ml-auto text-[10px] text-muted-foreground/50">Last 6 weeks</span>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-end gap-2 px-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 animate-pulse rounded-t-sm bg-muted"
              style={{ height: `${30 + i * 10}%` }}
            />
          ))}
        </div>
      ) : !hasTrend ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5 py-8 text-center">
          <BarChart3 className="size-7 text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground">
            Trend data will appear as tasks are completed.
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
            <defs>
              <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              domain={[0, Math.max(maxVal + 1, 4)]}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(v) => {
                const n = Number(v ?? 0);
                return [`${n} completed`, ""] as [string, string];
              }}
              contentStyle={{
                fontSize: "11px",
                padding: "4px 8px",
                borderRadius: "6px",
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--card))",
                color: "hsl(var(--foreground))",
              }}
              itemStyle={{ margin: 0 }}
              cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="completed"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#completedGrad)"
              dot={{ fill: "#10b981", r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "#10b981", strokeWidth: 0 }}
              animationDuration={800}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// â”€â”€ AI Insights panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function AiInsightsPanel({
  insights,
  isLoading,
}: {
  insights: AiInsight[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Bot className="size-3.5 text-primary" />
          <h2 className="text-sm font-semibold">AI Insights</h2>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3 rounded-lg border border-border p-3">
              <div className="size-8 animate-pulse rounded-lg bg-muted" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-40 animate-pulse rounded bg-muted" />
                <div className="h-3 w-full animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Bot className="size-3.5 text-primary" />
        <h2 className="text-sm font-semibold">AI Insights</h2>
        <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground/50">
          <Sparkles className="size-2.5" />
          From your data
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {insights.map((insight) => {
          const styles = SEVERITY_STYLES[insight.severity];
          const Icon = insight.icon;

          return (
            <div
              key={insight.id}
              className={cn(
                "relative flex items-start gap-3 overflow-hidden rounded-lg border border-border p-3 transition-colors",
                "hover:bg-muted/20",
              )}
            >
              {/* Severity bar */}
              <div className={cn("absolute left-0 top-0 h-full w-0.5", styles.bar)} />

              {/* Icon */}
              <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", styles.badge)}>
                <Icon className={cn("size-3.5", styles.icon)} aria-hidden="true" />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1 pl-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium leading-tight">{insight.title}</p>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                      styles.badge,
                      styles.badgeText,
                    )}
                  >
                    {SEVERITY_LABEL[insight.severity]}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                  {insight.description}
                </p>
                {insight.action && (
                  <Link
                    href={insight.action.href as never}
                    className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                  >
                    {insight.action.label}
                    <ChevronRight className="size-3" />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// â”€â”€ Composed dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function DashboardStats() {
  const { data, isLoading, isError, refetch, isFetching } = useDashboardStats();

  if (isError) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        <AlertCircle className="size-4 shrink-0" />
        Failed to load analytics. Refresh to retry.
      </div>
    );
  }

  const stats = data ?? {
    projectCount: 0,
    tasksByStatus: { TODO: 0, IN_PROGRESS: 0, REVIEW: 0, DONE: 0 },
    tasksByPriority: { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 },
    overdueCount: 0,
    avgHealthScore: 0,
    overdueMilestoneCount: 0,
    completionTrend: Array.from({ length: 6 }, (_, i) => ({
      label: i === 5 ? "This wk" : `${5 - i}w ago`,
      completed: 0,
    })),
    recentTasks: [] as RecentTask[],
  };

  const totalTasks = Object.values(stats.tasksByStatus).reduce((a, b) => a + b, 0);
  const completionPct =
    totalTasks > 0 ? Math.round((stats.tasksByStatus.DONE / totalTasks) * 100) : 0;

  const insights = deriveInsights({
    tasksByStatus: stats.tasksByStatus,
    overdueCount: stats.overdueCount,
    avgHealthScore: stats.avgHealthScore,
    overdueMilestoneCount: stats.overdueMilestoneCount,
    totalTasks,
    completionPct,
  });

  return (
    <div className="flex flex-col gap-5">
      {/* Section header */}
      <div className="flex items-center gap-2.5">
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
          <BarChart3 className="size-3.5 text-primary" aria-hidden="true" />
        </div>
        <h2 className="text-sm font-semibold tracking-tight">Analytics</h2>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="ml-auto flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-muted-foreground/60 transition-colors hover:bg-muted/40 hover:text-muted-foreground"
          aria-label="Refresh stats"
        >
          <RefreshCw className={cn("size-3", isFetching && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* â”€â”€ Metric cards (2-col mobile, 3-col sm, 6-col lg) â”€â”€ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          <MetricCard
            key="projects"
            label="Projects"
            value={stats.projectCount}
            icon={FolderKanban}
            accent="primary"
            isLoading={isLoading}
            href="/projects"
          />,
          <MetricCard
            key="total"
            label="Total Tasks"
            value={totalTasks}
            icon={LayoutList}
            accent="default"
            isLoading={isLoading}
          />,
          <MetricCard
            key="done"
            label="Completed"
            value={stats.tasksByStatus.DONE}
            sub={totalTasks > 0 ? `of ${totalTasks}` : undefined}
            icon={CheckCircle2}
            accent="success"
            isLoading={isLoading}
          />,
          <MetricCard
            key="wip"
            label="In Progress"
            value={stats.tasksByStatus.IN_PROGRESS}
            icon={Zap}
            accent="blue"
            isLoading={isLoading}
          />,
          <MetricCard
            key="overdue"
            label="Overdue"
            value={stats.overdueCount}
            icon={stats.overdueCount > 0 ? AlertCircle : CheckCircle2}
            accent={stats.overdueCount > 0 ? "danger" : "success"}
            isLoading={isLoading}
          />,
          /* Completion % + Health Score combined card */
          <div key="completion" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
            {isLoading ? (
              <div className="flex flex-col gap-2">
                <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                <div className="h-7 w-12 animate-pulse rounded-md bg-muted" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                    <TrendingUp className="size-4 text-primary" aria-hidden="true" />
                  </div>
                  {stats.avgHealthScore > 0 && (
                    <HealthRing score={stats.avgHealthScore} />
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Completion</p>
                  <p className="mt-0.5 text-2xl font-bold tracking-tight tabular-nums">
                    {completionPct}%
                  </p>
                  {stats.avgHealthScore > 0 && (
                    <p className="mt-0.5 text-[11px] text-muted-foreground/60">
                      Health {stats.avgHealthScore}/100
                    </p>
                  )}
                </div>
              </>
            )}
          </div>,
        ].map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.06, ease: "easeOut" }}
          >
            {card}
          </motion.div>
        ))}
      </div>

      {/* â”€â”€ Charts row â”€â”€ */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatusDonut tasksByStatus={stats.tasksByStatus} isLoading={isLoading} />
        <CompletionTrend data={stats.completionTrend} isLoading={isLoading} />
      </div>

      {/* â”€â”€ Recent Work â”€â”€ */}
      <RecentWorkWidget tasks={stats.recentTasks ?? []} isLoading={isLoading} />

      {/* â”€â”€ AI Insights â”€â”€ */}
      <AiInsightsPanel insights={insights} isLoading={isLoading} />
    </div>
  );
}

// â”€â”€ Recent Work Widget â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const STATUS_DOT: Record<string, string> = {
  TODO: "bg-slate-400",
  IN_PROGRESS: "bg-blue-500",
  REVIEW: "bg-violet-500",
  DONE: "bg-emerald-500",
};

const STATUS_LABEL: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  REVIEW: "In Review",
  DONE: "Done",
};

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function RecentWorkWidget({ tasks, isLoading }: { tasks: RecentTask[]; isLoading: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <History className="size-3.5 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Recent Work</h2>
        <span className="ml-auto text-[10px] text-muted-foreground/40">
          Last touched across all projects
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-1 py-1.5">
              <div className="size-2 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-1">
                <div className="h-3.5 w-48 animate-pulse rounded bg-muted" />
                <div className="h-2.5 w-24 animate-pulse rounded bg-muted/60" />
              </div>
              <div className="h-3 w-12 animate-pulse rounded bg-muted/50" />
            </div>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
          <Circle className="size-3.5" />
          No tasks yet â€” create a project to get started
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border/50">
          {tasks.map((task) => (
            <Link
              key={task.id}
              href={`/projects/${task.projectSlug}` as never}
              className="group flex items-center gap-3 px-1 py-2.5 transition-colors hover:bg-muted/30 rounded-lg"
            >
              <span
                className={cn("size-2 shrink-0 rounded-full", STATUS_DOT[task.status] ?? "bg-muted")}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium group-hover:text-primary transition-colors">
                  {task.title}
                </p>
                <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span>{task.projectName}</span>
                  <span className="opacity-40">Â·</span>
                  <span>{STATUS_LABEL[task.status] ?? task.status}</span>
                </div>
              </div>
              <span className="shrink-0 text-[10px] text-muted-foreground/50 tabular-nums">
                {timeAgo(task.updatedAt)}
              </span>
              <ChevronRight className="size-3 shrink-0 text-muted-foreground/20 transition-all group-hover:translate-x-0.5 group-hover:text-muted-foreground/50" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

