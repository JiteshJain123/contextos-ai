import Link from "next/link";
import { AlertCircle, CheckCircle2, LayoutList } from "lucide-react";

import type { ProjectDTO } from "@/lib/validators/project";

import { cn } from "@/lib/cn";

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

export function ProjectCard({ project }: { project: ProjectDTO; index?: number }) {
  const taskCount = project.taskCount ?? 0;
  const doneCount = project.doneTaskCount ?? 0;
  const overdueCount = project.overdueTaskCount ?? 0;
  const completionPct = taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0;

  const hasOverdue = overdueCount > 0;
  const isComplete = taskCount > 0 && doneCount === taskCount;

  return (
    <Link href={`/projects/${project.slug}` as never} className="group block h-full">
      <div className="flex h-full flex-col gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/40">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-semibold leading-snug group-hover:text-primary">
              {project.name}
            </h3>
            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">/{project.slug}</p>
          </div>
          <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
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
            <p className="text-xs italic text-muted-foreground/50">No description</p>
          )}
        </div>

        {/* Task stats + progress */}
        {taskCount > 0 ? (
          <div className="flex flex-col gap-2">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full", isComplete ? "bg-emerald-500" : "bg-primary")}
                style={{ width: `${completionPct}%` }}
              />
            </div>
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
              <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
                {completionPct}%
              </span>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground/60">No tasks yet</p>
        )}
      </div>
    </Link>
  );
}
