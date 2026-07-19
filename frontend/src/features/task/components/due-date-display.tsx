"use client";

import { Calendar } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/cn";

/**
 * Due-date pill with relative-style coloring (overdue / due-soon / normal).
 *
 * React 19's purity rule flags `Date.now()` during render. We capture the
 * timestamp in a useState initializer (called exactly once at mount), which
 * is the canonical workaround. Minor cost: an open card across midnight
 * won't recolor — acceptable for typical usage.
 */
export function DueDateDisplay({ dueDate }: { dueDate: string | Date | null }) {
  const [now] = useState(() => Date.now());

  if (!dueDate) return null;
  const date = dueDate instanceof Date ? dueDate : new Date(dueDate);

  const diff = date.getTime() - now;
  const overdue = diff < 0;
  const dueSoon = diff > 0 && diff < 24 * 60 * 60 * 1000;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 text-xs",
        overdue && "text-red-600 dark:text-red-400",
        dueSoon && "text-amber-600 dark:text-amber-400",
        !overdue && !dueSoon && "text-muted-foreground",
      )}
    >
      <Calendar className="size-3" aria-hidden="true" />
      <time dateTime={date.toISOString()}>
        {date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
      </time>
    </div>
  );
}
