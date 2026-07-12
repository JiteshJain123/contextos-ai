"use client";

import { cn } from "@/lib/cn";
import type { BreakdownTask, TaskMeta } from "@/features/task/hooks/use-task-breakdown";
import { CategoryBadge } from "./category-badge";
import { ComplexityBadge } from "./complexity-badge";

const PRIORITY_DOT: Record<string, string> = {
  URGENT: "bg-red-500",
  HIGH: "bg-orange-500",
  MEDIUM: "bg-yellow-400",
  LOW: "bg-slate-400",
};

interface BreakdownTaskCardV2Props {
  task: BreakdownTask;
  onToggle?: () => void;
  onUpdate?: (updates: Partial<BreakdownTask>) => void;
  compact?: boolean;
  meta?: TaskMeta;
  isSprintConflict?: boolean;
  isCircularDep?: boolean;
}

export function BreakdownTaskCardV2({
  task,
  onToggle,
  compact = false,
  meta,
  isSprintConflict = false,
  isCircularDep = false,
}: BreakdownTaskCardV2Props) {
  const isCritical = meta?.isCriticalPath ?? false;
  const isDepBlocked = meta?.isDepBlocked ?? false;
  const isDuplicate = meta?.isDuplicate ?? false;
  const depCount = task.dependencies?.length ?? 0;
  const isWarning = isDepBlocked || isSprintConflict || isCircularDep;

  return (
    <div
      className={cn(
        "group flex flex-col rounded-md border bg-card transition-all",
        compact ? "gap-0.5 p-1.5" : "gap-1.5 p-3",
        !task.selected && "opacity-40",
        isCritical
          ? "border-l-2 border-l-violet-500 border-border"
          : isCircularDep
            ? "border-l-2 border-l-red-500 border-border"
            : isWarning
              ? "border-l-2 border-l-amber-400 border-border"
              : "border-border",
      )}
    >
      <div className="flex items-start gap-1.5">
        {onToggle && (
          <input
            type="checkbox"
            checked={task.selected}
            onChange={onToggle}
            className={cn(
              "shrink-0 cursor-pointer accent-primary",
              compact ? "mt-0.5 size-3.5" : "mt-0.5 size-4",
            )}
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {/* Title row */}
          <div className="flex items-center gap-1">
            <span
              className={cn(
                "shrink-0 rounded-full",
                compact ? "size-1.5" : "size-2",
                PRIORITY_DOT[task.priority] ?? "bg-slate-400",
              )}
            />
            <span
              className={cn(
                "truncate font-medium leading-tight",
                compact ? "text-[11px]" : "text-sm",
              )}
            >
              {task.title}
            </span>
          </div>

          {/* Description — full mode only */}
          {!compact && task.description && (
            <p className="line-clamp-2 text-xs text-muted-foreground">{task.description}</p>
          )}

          {/* Intelligence chip row */}
          <div className="mt-0.5 flex flex-wrap items-center gap-0.5">
            {/* Effort hours */}
            {task.estimatedHours != null && (
              <span className="rounded bg-muted px-1 py-px text-[9px] font-medium tabular-nums text-muted-foreground">
                ~{task.estimatedHours}h
              </span>
            )}

            {/* Dependency count — amber when blocked or sprint conflict */}
            {depCount > 0 && (
              <span
                className={cn(
                  "rounded px-1 py-px text-[9px] font-medium",
                  isWarning
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                    : "bg-muted text-muted-foreground",
                )}
              >
                ↳{depCount}
              </span>
            )}

            {/* Critical path diamond */}
            {isCritical && (
              <span className="rounded bg-violet-100 px-1 py-px text-[9px] font-semibold text-violet-700 dark:bg-violet-950/40 dark:text-violet-400">
                ◆
              </span>
            )}

            {/* Duplicate warning */}
            {isDuplicate && (
              <span className="rounded bg-red-100 px-1 py-px text-[9px] font-medium text-red-600 dark:bg-red-950/40 dark:text-red-400">
                dup
              </span>
            )}

            {/* Blocked dep chip */}
            {isDepBlocked && (
              <span className="rounded bg-amber-100 px-1 py-px text-[9px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                blocked
              </span>
            )}

            {/* Circular dep chip */}
            {isCircularDep && (
              <span className="rounded bg-red-100 px-1 py-px text-[9px] font-semibold text-red-600 dark:bg-red-950/40 dark:text-red-400">
                cycle
              </span>
            )}

            {/* Full mode: category + complexity + date */}
            {!compact && task.category && <CategoryBadge category={task.category} />}
            {!compact && task.complexity && <ComplexityBadge complexity={task.complexity} />}
            {!compact && task.suggestedDueDate && (
              <span className="text-xs text-muted-foreground">
                {new Date(task.suggestedDueDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
          </div>

          {/* Dependency name pills — full mode only, color-coded by resolution status */}
          {!compact && meta?.resolvedDeps && meta.resolvedDeps.length > 0 && (
            <div className="flex flex-wrap gap-0.5">
              {meta.resolvedDeps.slice(0, 3).map((dep, i) => (
                <span
                  key={i}
                  className={cn(
                    "rounded px-1 py-px text-[9px]",
                    dep.inBatch
                      ? dep.isSelected
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  ↳ {dep.title.length > 22 ? dep.title.slice(0, 20) + "…" : dep.title}
                </span>
              ))}
              {meta.resolvedDeps.length > 3 && (
                <span className="rounded bg-muted px-1 py-px text-[9px] text-muted-foreground">
                  +{meta.resolvedDeps.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
