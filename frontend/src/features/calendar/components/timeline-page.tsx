"use client";

import { useState } from "react";
import { GanttChartSquare, Loader2, Sparkles } from "lucide-react";
import { motion } from "motion/react";

import { useCalendarData } from "../hooks/use-calendar-data";
import { useMilestones } from "../hooks/use-milestones";
import { TimelineGantt } from "./timeline-gantt";
import { MilestoneSidebar } from "./milestone-sidebar";

// ── Props ─────────────────────────────────────────────────────────────────────

interface TimelinePageProps {
  projectId: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TimelinePage({ projectId }: TimelinePageProps) {
  const calendarQuery = useCalendarData(projectId);
  const milestonesQuery = useMilestones(projectId);
  const [clickedTaskId, setClickedTaskId] = useState<string | null>(null);

  const scheduledCount =
    (calendarQuery.data?.tasks.filter((t) => t.dueDate).length ?? 0) +
    (calendarQuery.data?.milestones.length ?? 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
          <GanttChartSquare className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Timeline</h1>
          <p className="text-sm text-muted-foreground">
            Gantt-style view of tasks and milestones across time
          </p>
        </div>
        {calendarQuery.data && scheduledCount > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="ml-auto flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1"
          >
            <Sparkles className="size-3 text-primary" />
            <span className="text-xs font-medium text-primary">
              {scheduledCount} items
            </span>
          </motion.div>
        )}
      </div>

      {/* Main grid */}
      <div className="grid gap-5 lg:grid-cols-[1fr_220px]">
        {/* Gantt */}
        <div className="rounded-xl border border-border bg-card p-4 min-w-0 overflow-hidden">
          {calendarQuery.isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <TimelineGantt
              data={calendarQuery.data ?? { tasks: [], milestones: [], documentDeadlines: [] }}
              onTaskClick={setClickedTaskId}
            />
          )}
        </div>

        {/* Milestone sidebar */}
        <div className="flex flex-col gap-4">
          <MilestoneSidebar
            projectId={projectId}
            milestones={milestonesQuery.data ?? []}
          />
        </div>
      </div>

      {/* Selected task info */}
      {clickedTaskId && (
        <div className="rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
          Selected task: <code className="font-mono">{clickedTaskId}</code> — edit panel coming soon
        </div>
      )}
    </div>
  );
}
