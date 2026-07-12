"use client";

import dynamic from "next/dynamic";
import { useState, useCallback } from "react";
import { CalendarDays, Loader2, Sparkles } from "lucide-react";
import { motion } from "motion/react";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { queryKeys } from "@/lib/query-keys";
import { taskApi } from "@/features/task/api/task.api";

import { useCalendarData } from "../hooks/use-calendar-data";
import { useMilestones } from "../hooks/use-milestones";
import { MilestoneSidebar } from "./milestone-sidebar";
import { QuickTaskForm } from "./quick-task-form";

// SSR-safe dynamic import for FullCalendar
const FullCalendarView = dynamic(
  () =>
    import("./full-calendar-view").then((m) => ({ default: m.FullCalendarView })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    ),
  },
);

// ── Props ─────────────────────────────────────────────────────────────────────

interface CalendarPageProps {
  projectId: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CalendarPage({ projectId }: CalendarPageProps) {
  const calendarQuery = useCalendarData(projectId);
  const milestonesQuery = useMilestones(projectId);
  const queryClient = useQueryClient();

  const [quickTaskDate, setQuickTaskDate] = useState<Date | null>(null);
  const [showQuickTask, setShowQuickTask] = useState(false);

  const handleDateClick = useCallback((date: Date) => {
    setQuickTaskDate(date);
    setShowQuickTask(true);
  }, []);

  const handleTaskClick = useCallback((taskId: string) => {
    toast.info(`Task selected: open edit dialog for ${taskId}`);
  }, []);

  const handleTaskDateChange = useCallback(
    async (taskId: string, newDueDate: Date, newStartDate: Date | null) => {
      try {
        await taskApi.update(taskId, {
          dueDate: newDueDate,
          ...(newStartDate !== null ? { startDate: newStartDate } : {}),
        });
        await queryClient.invalidateQueries({
          queryKey: queryKeys.calendar.byProject(projectId),
        });
        await queryClient.invalidateQueries({
          queryKey: queryKeys.task.byProject(projectId),
        });
        toast.success("Task rescheduled");
      } catch {
        toast.error("Failed to reschedule task");
      }
    },
    [projectId, queryClient],
  );

  const isEmpty =
    !calendarQuery.isLoading &&
    calendarQuery.data &&
    calendarQuery.data.tasks.filter((t) => t.dueDate).length === 0 &&
    calendarQuery.data.milestones.length === 0 &&
    calendarQuery.data.documentDeadlines.length === 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
          <CalendarDays className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Calendar</h1>
          <p className="text-sm text-muted-foreground">
            Tasks, milestones, and deadlines in a unified calendar
          </p>
        </div>
        {calendarQuery.data && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="ml-auto flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1"
          >
            <Sparkles className="size-3 text-primary" />
            <span className="text-xs font-medium text-primary">
              {calendarQuery.data.tasks.filter((t) => t.dueDate).length} scheduled
            </span>
          </motion.div>
        )}
      </div>

      {/* Main grid */}
      <div className="grid gap-5 lg:grid-cols-[1fr_220px]">
        {/* Calendar */}
        <div className="rounded-xl border border-border bg-card p-4 min-w-0">
          {calendarQuery.isLoading ? (
            <div className="flex h-96 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
              <CalendarDays className="size-12 text-muted-foreground/40" />
              <div>
                <p className="text-sm font-medium">Nothing scheduled yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add due dates to tasks or click a day to create one.
                </p>
              </div>
            </div>
          ) : (
            <FullCalendarView
              data={calendarQuery.data!}
              onTaskClick={handleTaskClick}
              onTaskDateChange={handleTaskDateChange}
              onDateClick={handleDateClick}
            />
          )}
        </div>

        {/* Milestone sidebar */}
        <div className="flex flex-col gap-4">
          <MilestoneSidebar
            projectId={projectId}
            milestones={milestonesQuery.data ?? []}
          />

          {/* Legend */}
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Legend
            </p>
            <div className="flex flex-col gap-2">
              {[
                { color: "bg-red-500", label: "Urgent tasks" },
                { color: "bg-orange-500", label: "High priority" },
                { color: "bg-blue-500", label: "Medium priority" },
                { color: "bg-slate-400", label: "Low priority" },
                { color: "bg-violet-500", label: "Milestones" },
                { color: "bg-amber-500", label: "Doc deadlines" },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className={`size-3 rounded-sm ${color}`} />
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick task creation dialog */}
      {showQuickTask && (
        <QuickTaskForm
          projectId={projectId}
          initialDate={quickTaskDate}
          onClose={() => {
            setShowQuickTask(false);
            setQuickTaskDate(null);
          }}
        />
      )}
    </div>
  );
}
