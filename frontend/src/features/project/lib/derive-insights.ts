import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  LayoutList,
  Lightbulb,
  TrendingDown,
  Trophy,
  Zap,
} from "lucide-react";
import type * as React from "react";

/**
 * Rule-based insight engine shared by the dashboard and the topbar
 * notifications bell. Pure function — derives insights from aggregate stats.
 */

export type Severity = "critical" | "warning" | "info" | "success";

export interface AiInsight {
  id: string;
  severity: Severity;
  icon: React.ElementType;
  title: string;
  description: string;
  action?: { label: string; href: string };
}

export const SEVERITY_ICON: Record<Severity, string> = {
  critical: "text-red-500",
  warning: "text-amber-500",
  info: "text-muted-foreground",
  success: "text-emerald-500",
};

export function deriveInsights(stats: {
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
        "Create a project and add tasks to start tracking your work. Insights will appear as data builds up.",
      action: { label: "Create project", href: "/projects" },
    });
    return insights;
  }

  if (overdueCount >= 5) {
    insights.push({
      id: "many-overdue",
      severity: "critical",
      icon: AlertCircle,
      title: `${overdueCount} tasks are past their due date`,
      description:
        "This is impacting your project health. Review and re-prioritise or reschedule these tasks.",
      action: { label: "Open projects", href: "/projects" },
    });
  } else if (overdueCount > 0) {
    insights.push({
      id: "some-overdue",
      severity: "warning",
      icon: Clock,
      title: `${overdueCount} task${overdueCount === 1 ? " is" : "s are"} overdue`,
      description: "Address these soon to prevent them from piling up.",
      action: { label: "Open projects", href: "/projects" },
    });
  }

  if (overdueMilestoneCount > 0) {
    insights.push({
      id: "milestone-delay",
      severity: overdueMilestoneCount >= 2 ? "critical" : "warning",
      icon: AlertTriangle,
      title: `${overdueMilestoneCount} milestone${overdueMilestoneCount === 1 ? "" : "s"} missed`,
      description:
        "Missed milestones indicate timeline slippage. Review your plan and update target dates.",
      action: { label: "View projects", href: "/projects" },
    });
  }

  if (completionPct < 15 && totalTasks >= 5) {
    insights.push({
      id: "low-completion",
      severity: "warning",
      icon: TrendingDown,
      title: "Completion rate is very low",
      description: `Only ${completionPct}% of tasks are done. Consider breaking large tasks into smaller items.`,
    });
  } else if (completionPct >= 80) {
    insights.push({
      id: "high-completion",
      severity: "success",
      icon: Trophy,
      title: `${completionPct}% completion — great progress`,
      description: "You're in the final stretch. Keep the momentum and close out the remaining tasks.",
    });
  }

  const wipCount = tasksByStatus.IN_PROGRESS + tasksByStatus.REVIEW;
  const wipRatio = totalTasks > 0 ? wipCount / totalTasks : 0;
  if (wipRatio > 0.5 && wipCount >= 6) {
    insights.push({
      id: "high-wip",
      severity: "warning",
      icon: Zap,
      title: `High work-in-progress (${wipCount} tasks active)`,
      description: "Try finishing in-progress work before pulling in new tasks.",
    });
  }

  const todoRatio = totalTasks > 0 ? tasksByStatus.TODO / totalTasks : 0;
  if (todoRatio > 0.6 && tasksByStatus.TODO >= 10) {
    insights.push({
      id: "large-backlog",
      severity: "info",
      icon: LayoutList,
      title: `Large backlog — ${tasksByStatus.TODO} tasks waiting`,
      description: "Use the AI Breakdown tool to prioritise and schedule work into sprints.",
      action: { label: "Open projects", href: "/projects" },
    });
  }

  if (avgHealthScore > 0 && avgHealthScore < 40) {
    insights.push({
      id: "low-health",
      severity: "critical",
      icon: AlertCircle,
      title: `Project health is critical (${avgHealthScore}/100)`,
      description:
        "Visit each project's Insights tab for a full breakdown of what's dragging health down.",
    });
  } else if (avgHealthScore >= 80) {
    insights.push({
      id: "great-health",
      severity: "success",
      icon: CheckCircle2,
      title: `Excellent project health (${avgHealthScore}/100)`,
      description: "Your projects are in great shape — completion is strong and overdue count is low.",
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "all-clear",
      severity: "success",
      icon: CheckCircle2,
      title: "Everything looks good",
      description: "No outstanding issues detected. Keep up the pace.",
    });
  }

  return insights.slice(0, 5);
}
