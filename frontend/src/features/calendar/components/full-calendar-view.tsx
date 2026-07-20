"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, EventChangeArg, EventInput } from "@fullcalendar/core";
import type { DateClickArg } from "@fullcalendar/interaction";

import type { CalendarData } from "@/lib/validators/calendar";

// ── Priority colours ──────────────────────────────────────────────────────────

const PRIORITY_COLOR: Record<string, string> = {
  URGENT: "#ef4444",
  HIGH: "#f97316",
  MEDIUM: "#3b82f6",
  LOW: "#6b7280",
};

const STATUS_OPACITY: Record<string, number> = {
  DONE: 0.5,
  IN_PROGRESS: 1,
  REVIEW: 0.85,
  TODO: 1,
};

// ── Event builders ────────────────────────────────────────────────────────────

function taskToEvent(task: CalendarData["tasks"][number]): EventInput | null {
  if (!task.dueDate) return null;
  const color = PRIORITY_COLOR[task.priority] ?? "#3b82f6";
  const opacity = STATUS_OPACITY[task.status] ?? 1;

  return {
    id: `task-${task.id}`,
    title: task.title,
    start: task.startDate ? new Date(task.startDate) : new Date(task.dueDate),
    end: task.dueDate ? new Date(new Date(task.dueDate).getTime() + 86_400_000) : undefined,
    allDay: true,
    backgroundColor: color,
    borderColor: color,
    textColor: "#ffffff",
    opacity,
    extendedProps: {
      type: "task",
      taskId: task.id,
      status: task.status,
      priority: task.priority,
    },
  };
}

function milestoneToEvent(m: CalendarData["milestones"][number]): EventInput {
  return {
    id: `milestone-${m.id}`,
    title: `◆ ${m.title}`,
    start: new Date(m.targetDate),
    allDay: true,
    backgroundColor: m.completed ? "#6b7280" : "#8b5cf6",
    borderColor: m.completed ? "#6b7280" : "#7c3aed",
    textColor: "#ffffff",
    extendedProps: { type: "milestone", milestoneId: m.id, completed: m.completed },
  };
}

function deadlineToEvent(d: CalendarData["documentDeadlines"][number]): EventInput {
  return {
    id: `deadline-${d.id}`,
    title: `📄 ${d.description}`,
    start: new Date(d.date),
    allDay: true,
    backgroundColor: "#f59e0b",
    borderColor: "#d97706",
    textColor: "#ffffff",
    extendedProps: { type: "deadline", documentName: d.documentName },
  };
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface FullCalendarViewProps {
  data: CalendarData;
  onTaskClick: (taskId: string) => void;
  onTaskDateChange: (taskId: string, newDueDate: Date, newStartDate: Date | null) => void;
  onDateClick: (date: Date) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function FullCalendarView({
  data,
  onTaskClick,
  onTaskDateChange,
  onDateClick,
}: FullCalendarViewProps) {
  const events: EventInput[] = [
    ...data.tasks.map(taskToEvent).filter((e): e is EventInput => e !== null),
    ...data.milestones.map(milestoneToEvent),
    ...data.documentDeadlines.map(deadlineToEvent),
  ];

  const handleEventClick = (info: EventClickArg) => {
    const { type, taskId } = info.event.extendedProps as {
      type: string;
      taskId?: string;
    };
    if (type === "task" && taskId) {
      onTaskClick(taskId);
    }
  };

  const handleEventChange = (info: EventChangeArg) => {
    const { type, taskId } = info.event.extendedProps as {
      type: string;
      taskId?: string;
    };
    if (type !== "task" || !taskId) {
      info.revert();
      return;
    }
    const newEnd = info.event.end;
    const newStart = info.event.start;
    if (!newEnd || !newStart) {
      info.revert();
      return;
    }
    const dueDate = new Date(newEnd.getTime() - 86_400_000);
    const startDate = info.event.start && !isSameDate(info.event.start, dueDate)
      ? info.event.start
      : null;
    onTaskDateChange(taskId, dueDate, startDate);
  };

  const handleDateClick = (info: DateClickArg) => {
    onDateClick(info.date);
  };

  return (
    <div className="fc-theme-standard [&_.fc]:font-sans [&_.fc-toolbar-title]:text-base [&_.fc-toolbar-title]:font-semibold [&_.fc-button]:text-xs [&_.fc-button]:rounded-lg [&_.fc-button-primary]:bg-primary [&_.fc-button-primary]:border-primary [&_.fc-event]:cursor-pointer [&_.fc-daygrid-event]:rounded-md [&_.fc-daygrid-event]:px-1">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        events={events}
        editable={true}
        droppable={true}
        selectable={true}
        height="auto"
        dayMaxEvents={4}
        eventClick={handleEventClick}
        eventChange={handleEventChange}
        dateClick={handleDateClick}
        eventDisplay="block"
        eventTimeFormat={{ hour: undefined, minute: undefined }}
        displayEventTime={false}
      />
    </div>
  );
}

function isSameDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
