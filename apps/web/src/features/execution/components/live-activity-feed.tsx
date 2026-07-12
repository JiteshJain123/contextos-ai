"use client";

import { motion, AnimatePresence } from "motion/react";
import {
  CheckCircle2,
  Plus,
  ArrowRight,
  Trash2,
} from "lucide-react";

import { cn } from "@/lib/cn";
import type { LiveEvent, LiveEventType } from "../hooks/use-live-events";

// ─── Event display config ────────────────────────────────────────────────────

const EVENT_CONFIG: Record<
  LiveEventType,
  { icon: typeof Plus; label: string; dotClass: string }
> = {
  task_created: {
    icon: Plus,
    label: "Task created",
    dotClass: "bg-blue-500",
  },
  task_updated: {
    icon: ArrowRight,
    label: "Task updated",
    dotClass: "bg-muted-foreground/40",
  },
  task_deleted: {
    icon: Trash2,
    label: "Task removed",
    dotClass: "bg-muted-foreground/40",
  },
  task_status_changed: {
    icon: CheckCircle2,
    label: "Status changed",
    dotClass: "bg-emerald-500",
  },
};

function timeAgo(date: Date): string {
  const now     = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60)   return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;

  // Calendar-day comparison to avoid "83h ago" style values
  const todayStart  = new Date(now.getFullYear(),  now.getMonth(),  now.getDate()).getTime();
  const eventStart  = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayDiff     = Math.round((todayStart - eventStart) / 86_400_000);

  if (dayDiff === 0) return `${Math.floor(diffSec / 3600)}h ago`;
  if (dayDiff === 1) return "Yesterday";

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Single event row ────────────────────────────────────────────────────────

function EventRow({ event }: { event: LiveEvent }) {
  const cfg = EVENT_CONFIG[event.type] ?? EVENT_CONFIG.task_updated;
  const Icon = cfg.icon;
  const taskTitle =
    typeof event.metadata?.taskTitle === "string" ? event.metadata.taskTitle : null;
  const newStatus =
    typeof event.metadata?.status === "string"
      ? event.metadata.status.replace(/_/g, " ").toLowerCase()
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="overflow-hidden"
    >
      <div className="flex items-start gap-2.5 py-2 first:pt-0">
        <div className="relative mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted/70">
          <Icon className="size-2.5 text-muted-foreground" />
          <span
            className={cn(
              "absolute -right-0.5 -top-0.5 size-1.5 rounded-full ring-1 ring-background",
              cfg.dotClass,
            )}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] leading-snug">
            {taskTitle ? (
              <span className="font-medium text-foreground/85">{taskTitle}</span>
            ) : (
              <span className="text-muted-foreground">{cfg.label}</span>
            )}
            {newStatus && event.type === "task_status_changed" && (
              <span className="ml-1 text-muted-foreground/60">→ {newStatus}</span>
            )}
          </p>
          <p className="mt-0.5 text-[9px] text-muted-foreground/50">{timeAgo(event.receivedAt)}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Connection indicator ────────────────────────────────────────────────────

function ConnectionDot({ isConnected }: { isConnected: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      {isConnected ? (
        <>
          <motion.span
            animate={{ opacity: [1, 0.25, 1] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            className="inline-block size-1.5 rounded-full bg-emerald-500"
          />
          <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
            Live
          </span>
        </>
      ) : (
        <>
          <span className="inline-block size-1.5 rounded-full bg-muted-foreground/30" />
          <span className="text-[10px] text-muted-foreground/60">Connecting…</span>
        </>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

interface LiveActivityFeedProps {
  events: LiveEvent[];
  isConnected: boolean;
}

export function LiveActivityFeed({ events, isConnected }: LiveActivityFeedProps) {

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Live Activity</h3>
          <p className="text-[11px] text-muted-foreground">Real-time task events</p>
        </div>
        <ConnectionDot isConnected={isConnected} />
      </div>

      {/* Event list */}
      <div className="min-h-[96px] divide-y divide-border/40">
        {events.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex h-24 flex-col items-center justify-center gap-1.5"
          >
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              className="text-[10px] text-muted-foreground/50"
            >
              Waiting for events…
            </motion.span>
          </motion.div>
        ) : (
          <AnimatePresence initial={false} mode="popLayout">
            {events.slice(0, 8).map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </AnimatePresence>
        )}
      </div>

      {events.length > 0 && (
        <p className="text-[9px] text-muted-foreground/40">
          Showing last {Math.min(events.length, 8)} of {events.length} event{events.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
