import Link from "next/link";
import * as motion from "motion/react-client";
import { AlertCircle, CheckCircle2, LayoutList } from "lucide-react";

import type { ProjectDTO } from "@contextos-ai/validators/project";

import { cn } from "@/lib/cn";

const ACCENT_COLORS = [
  "from-violet-500 to-violet-400",
  "from-blue-500 to-blue-400",
  "from-emerald-500 to-emerald-400",
  "from-amber-500 to-amber-400",
  "from-rose-500 to-rose-400",
  "from-cyan-500 to-cyan-400",
] as const;

const ACCENT_GLOWS = [
  "hover:shadow-violet-500/10",
  "hover:shadow-blue-500/10",
  "hover:shadow-emerald-500/10",
  "hover:shadow-amber-500/10",
  "hover:shadow-rose-500/10",
  "hover:shadow-cyan-500/10",
] as const;

function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function ProjectCard({ project, index = 0 }: { project: ProjectDTO; index?: number }) {
  const taskCount = project.taskCount ?? 0;
  const doneCount = project.doneTaskCount ?? 0;
  const overdueCount = project.overdueTaskCount ?? 0;
  const completionPct = taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0;

  const hasOverdue = overdueCount > 0;
  const isComplete = taskCount > 0 && doneCount === taskCount;

  const progressColor = isComplete
    ? "bg-emerald-500"
    : hasOverdue
      ? "bg-red-500"
      : completionPct >= 60
        ? "bg-blue-500"
        : "bg-primary";

  const accentGradient = ACCENT_COLORS[index % ACCENT_COLORS.length];
  const accentGlow = ACCENT_GLOWS[index % ACCENT_GLOWS.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: index * 0.05, ease: "easeOut" }}
    >
      <Link href={`/projects/${project.slug}` as never} className="group block h-full">
        <div
          className={cn(
            "flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card",
            "shadow-sm transition-all duration-200",
            "hover:border-foreground/15 hover:shadow-lg hover:-translate-y-0.5",
            accentGlow,
          )}
        >
          {/* Gradient accent stripe */}
          <div className={cn("h-0.5 shrink-0 bg-gradient-to-r", accentGradient)} />

          <div className="flex flex-1 flex-col gap-3 p-4">
            {/* Header row */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate font-semibold leading-snug transition-colors group-hover:text-primary">
                  {project.name}
                </h3>
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground/50">
                  /{project.slug}
                </p>
              </div>
              <span className="shrink-0 text-[10px] text-muted-foreground/40 tabular-nums">
                {timeAgo(project.createdAt)}
              </span>
            </div>

            {/* Description */}
            <div className="flex-1">
              {project.description ? (
                <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {project.description}
                </p>
              ) : (
                <p className="text-xs italic text-muted-foreground/30">No description</p>
              )}
            </div>

            {/* Task stats + progress */}
            <div className="flex flex-col gap-2">
              {taskCount > 0 ? (
                <>
                  {/* Animated progress bar */}
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                    <motion.div
                      className={cn("h-full rounded-full", progressColor)}
                      initial={{ width: 0 }}
                      animate={{ width: `${completionPct}%` }}
                      transition={{ duration: 0.8, delay: index * 0.05 + 0.2, ease: "easeOut" }}
                    />
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <LayoutList className="size-3" />
                        {taskCount} task{taskCount !== 1 ? "s" : ""}
                      </span>
                      {isComplete ? (
                        <span className="flex items-center gap-0.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="size-3" />
                          Done
                        </span>
                      ) : hasOverdue ? (
                        <span className="flex items-center gap-0.5 text-[11px] text-red-500">
                          <AlertCircle className="size-3" />
                          {overdueCount} overdue
                        </span>
                      ) : null}
                    </div>
                    <span
                      className={cn(
                        "text-[11px] font-semibold tabular-nums",
                        isComplete
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-muted-foreground",
                      )}
                    >
                      {completionPct}%
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-[11px] text-muted-foreground/40">No tasks yet</p>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
