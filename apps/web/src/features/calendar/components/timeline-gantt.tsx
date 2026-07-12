"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { motion } from "motion/react";

import type { CalendarData } from "@contextos-ai/validators/calendar";
import { cn } from "@/lib/cn";
import {
  addDays,
  addMonths,
  addQuarters,
  addWeeks,
  diffDays,
  formatShortDate,
  formatWeekLabel,
  getQuarter,
  isToday,
  monthName,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
} from "../lib/date-utils";

// ── Zoom levels ───────────────────────────────────────────────────────────────

type Zoom = "days" | "weeks" | "months" | "quarters";

const ZOOM_CONFIG: Record<
  Zoom,
  { colWidthPx: number; numCols: number; label: string }
> = {
  days: { colWidthPx: 56, numCols: 30, label: "Days" },
  weeks: { colWidthPx: 100, numCols: 12, label: "Weeks" },
  months: { colWidthPx: 120, numCols: 6, label: "Months" },
  quarters: { colWidthPx: 160, numCols: 4, label: "Quarters" },
};

// ── Priority / status colours ─────────────────────────────────────────────────

const PRIORITY_BG: Record<string, string> = {
  URGENT: "bg-red-500",
  HIGH: "bg-orange-500",
  MEDIUM: "bg-blue-500",
  LOW: "bg-slate-400",
};

const STATUS_OPACITY: Record<string, string> = {
  DONE: "opacity-40",
  IN_PROGRESS: "opacity-100",
  REVIEW: "opacity-80",
  TODO: "opacity-90",
};

// ── Date helpers for each zoom ────────────────────────────────────────────────

function getColStart(zoom: Zoom, anchor: Date): Date {
  switch (zoom) {
    case "days": return startOfDay(anchor);
    case "weeks": return startOfWeek(anchor);
    case "months": return startOfMonth(anchor);
    case "quarters": return startOfQuarter(anchor);
  }
}

function advanceCol(zoom: Zoom, d: Date, n: number): Date {
  switch (zoom) {
    case "days": return addDays(d, n);
    case "weeks": return addWeeks(d, n);
    case "months": return addMonths(d, n);
    case "quarters": return addQuarters(d, n);
  }
}

function colLabel(zoom: Zoom, d: Date): string {
  switch (zoom) {
    case "days": return formatShortDate(d);
    case "weeks": return formatWeekLabel(d);
    case "months": return `${monthName(d)} ${d.getFullYear()}`;
    case "quarters": return `Q${getQuarter(d)} ${d.getFullYear()}`;
  }
}

function colIsToday(zoom: Zoom, d: Date): boolean {
  if (zoom !== "days") return false;
  return isToday(d);
}

// ── Task bar positioning ──────────────────────────────────────────────────────

function getBarStyle(
  startDate: Date | null,
  dueDate: Date | null,
  viewStart: Date,
  totalDays: number,
  totalWidth: number,
): { left: number; width: number } | null {
  if (!dueDate) return null;

  const effectiveStart = startDate
    ? startOfDay(new Date(startDate))
    : startOfDay(new Date(dueDate));
  const effectiveEnd = startOfDay(new Date(dueDate));

  const startOffset = diffDays(viewStart, effectiveStart);
  const duration = Math.max(1, diffDays(effectiveStart, effectiveEnd) + 1);

  const left = (startOffset / totalDays) * totalWidth;
  const width = (duration / totalDays) * totalWidth;

  return { left, width };
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface TimelineGanttProps {
  data: CalendarData;
  onTaskClick: (taskId: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TimelineGantt({ data, onTaskClick }: TimelineGanttProps) {
  const [zoom, setZoom] = useState<Zoom>("weeks");
  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date());
  const scrollRef = useRef<HTMLDivElement>(null);

  const { colWidthPx, numCols } = ZOOM_CONFIG[zoom];
  const totalWidth = colWidthPx * numCols;

  const viewStart = useMemo(() => getColStart(zoom, anchorDate), [zoom, anchorDate]);
  const viewEnd = useMemo(() => advanceCol(zoom, viewStart, numCols), [zoom, viewStart, numCols]);
  const totalDays = useMemo(() => diffDays(viewStart, viewEnd) || 1, [viewStart, viewEnd]);

  const columns = useMemo(
    () =>
      Array.from({ length: numCols }, (_, i) => ({
        date: advanceCol(zoom, viewStart, i),
        isNow: colIsToday(zoom, advanceCol(zoom, viewStart, i)),
      })),
    [zoom, viewStart, numCols],
  );

  // Tasks that have at least a dueDate
  const tasksWithDates = useMemo(
    () =>
      data.tasks
        .filter((t) => t.dueDate !== null)
        .sort((a, b) => {
          const aDate = a.startDate ?? a.dueDate!;
          const bDate = b.startDate ?? b.dueDate!;
          return new Date(aDate).getTime() - new Date(bDate).getTime();
        }),
    [data.tasks],
  );

  function goBack() {
    setAnchorDate((d) => advanceCol(zoom, d, -1));
  }

  function goForward() {
    setAnchorDate((d) => advanceCol(zoom, d, 1));
  }

  function jumpToToday() {
    setAnchorDate(new Date());
  }

  if (tasksWithDates.length === 0 && data.milestones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <CalendarDays className="size-12 text-muted-foreground/40" />
        <div>
          <p className="text-sm font-medium">No scheduled items</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add due dates to tasks or create milestones to see them here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Zoom buttons */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(Object.keys(ZOOM_CONFIG) as Zoom[]).map((z) => (
            <button
              key={z}
              type="button"
              onClick={() => setZoom(z)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors",
                zoom === z
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              {ZOOM_CONFIG[z].label}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goBack}
            className="flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={jumpToToday}
            className="px-3 py-1 rounded-md border border-border text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
          >
            Today
          </button>
          <button
            type="button"
            onClick={goForward}
            className="flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <span className="ml-auto text-xs text-muted-foreground">
          {formatShortDate(viewStart)} — {formatShortDate(advanceCol(zoom, viewStart, numCols - 1))}
        </span>
      </div>

      {/* Gantt table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="flex">
          {/* Fixed left panel */}
          <div className="w-[200px] shrink-0 border-r border-border bg-card">
            {/* Header spacer */}
            <div className="h-10 border-b border-border flex items-center px-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Name
              </span>
            </div>

            {/* Milestone rows */}
            {data.milestones.map((m) => (
              <div
                key={m.id}
                className="h-10 border-b border-border/50 flex items-center px-3 gap-2"
              >
                <span className="text-violet-500 text-sm shrink-0">◆</span>
                <span
                  className={cn(
                    "text-xs font-medium truncate",
                    m.completed && "line-through text-muted-foreground",
                  )}
                >
                  {m.title}
                </span>
              </div>
            ))}

            {/* Task rows */}
            {tasksWithDates.map((task) => (
              <button
                key={task.id}
                type="button"
                className="w-full h-10 border-b border-border/50 flex items-center px-3 gap-2 cursor-pointer hover:bg-muted/50 transition-colors text-left"
                onClick={() => onTaskClick(task.id)}
              >
                <div
                  className={cn(
                    "size-2 rounded-full shrink-0",
                    PRIORITY_BG[task.priority] ?? "bg-slate-400",
                  )}
                />
                <span
                  className={cn(
                    "text-xs truncate",
                    task.status === "DONE" && "line-through text-muted-foreground",
                  )}
                >
                  {task.title}
                </span>
              </button>
            ))}
          </div>

          {/* Scrollable chart area */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-x-auto"
          >
            <div style={{ width: totalWidth, minWidth: "100%" }}>
              {/* Date header row */}
              <div
                className="flex h-10 border-b border-border bg-muted/30"
                style={{ width: totalWidth }}
              >
                {columns.map(({ date, isNow }, i) => (
                  <div
                    key={i}
                    className={cn(
                      "shrink-0 flex items-center justify-center border-r border-border/30 text-xs",
                      isNow
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-muted-foreground",
                    )}
                    style={{ width: colWidthPx }}
                  >
                    <span className="truncate px-1">{colLabel(zoom, date)}</span>
                  </div>
                ))}
              </div>

              {/* Milestone bars */}
              {data.milestones.map((m) => {
                const dayOffset = diffDays(viewStart, startOfDay(new Date(m.targetDate)));
                const leftPx = (dayOffset / totalDays) * totalWidth;
                const inView = dayOffset >= -1 && dayOffset <= totalDays + 1;
                return (
                  <div
                    key={m.id}
                    className="relative h-10 border-b border-border/50"
                    style={{ width: totalWidth }}
                  >
                    {/* Grid lines */}
                    {columns.map(({ isNow }, i) => (
                      <div
                        key={i}
                        className={cn(
                          "absolute top-0 bottom-0 border-r border-border/20",
                          isNow && "bg-primary/5",
                        )}
                        style={{ left: i * colWidthPx, width: colWidthPx }}
                      />
                    ))}

                    {/* Milestone: vertical line + diamond */}
                    {inView && (
                      <div
                        className="absolute inset-y-0 -translate-x-px"
                        style={{ left: leftPx }}
                      >
                        {/* Vertical dashed line */}
                        <div
                          className={cn(
                            "absolute inset-y-0 w-px",
                            m.completed
                              ? "bg-muted-foreground/20"
                              : "bg-violet-400/50",
                          )}
                          style={{ borderLeft: m.completed ? undefined : "1.5px dashed" }}
                        />
                        {/* Diamond */}
                        <div
                          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                          title={`${m.title} — ${new Date(m.targetDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                        >
                          <div
                            className={cn(
                              "size-3.5 rotate-45 rounded-[2px] border-2 shadow-sm",
                              m.completed
                                ? "bg-muted border-muted-foreground/40"
                                : "bg-violet-500 border-violet-400",
                            )}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Task bars */}
              {tasksWithDates.map((task) => {
                const bar = getBarStyle(
                  task.startDate ? new Date(task.startDate) : null,
                  task.dueDate ? new Date(task.dueDate) : null,
                  viewStart,
                  totalDays,
                  totalWidth,
                );

                return (
                  <div
                    key={task.id}
                    className="relative h-10 border-b border-border/50"
                    style={{ width: totalWidth }}
                  >
                    {/* Grid lines */}
                    {columns.map(({ isNow }, i) => (
                      <div
                        key={i}
                        className={cn(
                          "absolute top-0 bottom-0 border-r border-border/20",
                          isNow && "bg-primary/5",
                        )}
                        style={{ left: i * colWidthPx, width: colWidthPx }}
                      />
                    ))}

                    {/* Task bar */}
                    {bar && (
                      <motion.button
                        type="button"
                        initial={{ scaleX: 0.8, opacity: 0 }}
                        animate={{ scaleX: 1, opacity: 1 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => onTaskClick(task.id)}
                        className={cn(
                          "absolute top-2 bottom-2 rounded-md flex items-center px-2 min-w-[8px]",
                          "cursor-pointer transition-all hover:brightness-110 hover:shadow-md",
                          PRIORITY_BG[task.priority] ?? "bg-blue-500",
                          STATUS_OPACITY[task.status] ?? "opacity-100",
                        )}
                        style={{
                          left: Math.max(0, bar.left),
                          width: Math.max(8, bar.width),
                          transformOrigin: "left",
                        }}
                      >
                        <span className="text-[10px] text-white font-medium truncate leading-none">
                          {bar.width > 40 ? task.title : ""}
                        </span>
                      </motion.button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="text-violet-500">◆</span>
          <span>Milestone</span>
        </div>
        {(["URGENT", "HIGH", "MEDIUM", "LOW"] as const).map((p) => (
          <div key={p} className="flex items-center gap-1.5">
            <div className={cn("size-2.5 rounded-sm", PRIORITY_BG[p])} />
            <span className="capitalize">{p.toLowerCase()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
