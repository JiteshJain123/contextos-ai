"use client";

import { Bell, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Popover } from "radix-ui";
import { useState } from "react";

import {
  deriveInsights,
  SEVERITY_ICON,
  type AiInsight,
} from "@/features/project/lib/derive-insights";
import { useDashboardStats } from "@/features/project/hooks/use-dashboard-stats";
import { cn } from "@/lib/cn";

/**
 * Topbar notifications bell. Surfaces the same rule-based insights as the
 * dashboard (overdue tasks, missed milestones, health warnings) in a popover.
 * The badge counts only actionable items (critical + warning).
 */
export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const { data } = useDashboardStats();

  let insights: AiInsight[] = [];
  if (data) {
    const totalTasks = Object.values(data.tasksByStatus).reduce((a, b) => a + b, 0);
    const completionPct =
      totalTasks > 0 ? Math.round((data.tasksByStatus.DONE / totalTasks) * 100) : 0;
    insights = deriveInsights({
      tasksByStatus: data.tasksByStatus,
      overdueCount: data.overdueCount,
      avgHealthScore: data.avgHealthScore,
      overdueMilestoneCount: data.overdueMilestoneCount,
      totalTasks,
      completionPct,
    });
  }

  const actionable = insights.filter(
    (i) => i.severity === "critical" || i.severity === "warning",
  ).length;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={
            actionable > 0 ? `Notifications — ${actionable} need attention` : "Notifications"
          }
          className="text-muted-foreground hover:text-foreground relative rounded-md p-1.5 transition-colors hover:bg-muted"
        >
          <Bell className="size-4" aria-hidden="true" />
          {actionable > 0 && (
            <span className="absolute right-0.5 top-0.5 flex size-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-semibold leading-none text-primary-foreground">
              {actionable}
            </span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 w-80 rounded-lg border border-border bg-popover text-popover-foreground outline-none"
        >
          <div className="border-b border-border px-4 py-2.5">
            <p className="text-sm font-semibold">Notifications</p>
          </div>
          <div className="max-h-96 overflow-auto">
            {insights.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                Loading insights…
              </p>
            ) : (
              <div className="divide-y divide-border">
                {insights.map((insight) => {
                  const Icon = insight.icon;
                  return (
                    <div key={insight.id} className="flex items-start gap-3 px-4 py-3">
                      <Icon
                        className={cn("mt-0.5 size-4 shrink-0", SEVERITY_ICON[insight.severity])}
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug">{insight.title}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                          {insight.description}
                        </p>
                        {insight.action && (
                          <Link
                            href={insight.action.href as never}
                            onClick={() => setOpen(false)}
                            className="mt-1.5 inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
                          >
                            {insight.action.label}
                            <ChevronRight className="size-3" aria-hidden="true" />
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="border-t border-border px-4 py-2">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-primary hover:underline"
            >
              View dashboard
            </Link>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
