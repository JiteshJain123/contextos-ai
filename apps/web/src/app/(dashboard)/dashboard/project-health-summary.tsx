"use client";

import Link from "next/link";
import { Activity, AlertTriangle, ArrowRight, ChevronRight, FolderKanban } from "lucide-react";
import type { ProjectDTO } from "@contextos-ai/validators/project";

import { cn } from "@/lib/cn";
import { useProjects } from "@/features/project/hooks/use-projects";
import { useProjectHealth } from "@/features/insights/hooks/use-project-health";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 75) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-500 dark:text-red-400";
}

function barColor(score: number) {
  if (score >= 75) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-400";
  return "bg-red-500";
}

function statusLabel(score: number) {
  if (score >= 75) return { label: "Healthy", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" };
  if (score >= 50) return { label: "Fair", cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400" };
  return { label: "At risk", cls: "bg-red-500/10 text-red-600 dark:text-red-400" };
}

// ─── Per-project row ──────────────────────────────────────────────────────────

function ProjectHealthRow({ project }: { project: ProjectDTO }) {
  const healthQuery = useProjectHealth(project.id);
  const health = healthQuery.data;
  const score = health?.score ?? null;

  const status = score !== null ? statusLabel(score) : null;

  return (
    <Link
      href={`/projects/${project.slug}/insights` as never}
      className="group flex items-center gap-3 rounded-lg p-2 transition-all hover:bg-muted/50"
    >
      {/* Icon with status dot */}
      <div className="relative shrink-0">
        <div className="flex size-8 items-center justify-center rounded-lg bg-muted transition-colors group-hover:bg-primary/10">
          <FolderKanban className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
        </div>
        {score !== null && (
          <span
            className={cn(
              "absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-card",
              barColor(score),
            )}
          />
        )}
      </div>

      {/* Name + bar */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium leading-tight">{project.name}</p>
          {score !== null && status && (
            <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold", status.cls)}>
              {status.label}
            </span>
          )}
        </div>
        {healthQuery.isLoading ? (
          <div className="mt-1.5 h-1 w-full animate-pulse rounded-full bg-muted" />
        ) : score !== null ? (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-[width] duration-700 ease-out", barColor(score))}
                style={{ width: `${score}%` }}
              />
            </div>
            <span className={cn("shrink-0 text-[11px] font-bold tabular-nums", scoreColor(score))}>
              {Math.round(score)}
            </span>
          </div>
        ) : (
          <p className="mt-0.5 text-[11px] text-muted-foreground/40">No score yet — visit Insights</p>
        )}
      </div>

      <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/20 transition-all group-hover:translate-x-0.5 group-hover:text-muted-foreground/50" />
    </Link>
  );
}

// ─── Widget ───────────────────────────────────────────────────────────────────

export function ProjectHealthSummary() {
  const projectsQuery = useProjects({ pageSize: 8 });
  const projects = projectsQuery.data?.data ?? [];

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {/* Widget header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="size-3.5 text-primary" />
          <h2 className="text-sm font-semibold">Project Health</h2>
        </div>
        <Link
          href="/projects"
          className="flex items-center gap-1 text-[11px] text-muted-foreground/60 transition-colors hover:text-muted-foreground"
        >
          View all
          <ArrowRight className="size-3" />
        </Link>
      </div>

      {/* Loading */}
      {projectsQuery.isLoading && (
        <div className="space-y-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg p-2">
              <div className="size-8 animate-pulse rounded-lg bg-muted" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-32 animate-pulse rounded bg-muted" />
                <div className="h-1 w-full animate-pulse rounded-full bg-muted/60" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!projectsQuery.isLoading && projects.length === 0 && (
        <div className="py-5 text-center">
          <p className="text-sm text-muted-foreground">No projects yet.</p>
          <Link href="/projects" className="mt-1 text-xs text-primary underline underline-offset-2">
            Create one
          </Link>
        </div>
      )}

      {/* List */}
      {!projectsQuery.isLoading && projects.length > 0 && (
        <div className="space-y-0.5">
          {projects.map((project) => (
            <ProjectHealthRow key={project.id} project={project} />
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-1.5 border-t border-border pt-3">
        <AlertTriangle className="size-3 text-muted-foreground/30" />
        <p className="text-[10px] text-muted-foreground/40">
          Scores compute on first visit to a project&apos;s Insights page.
        </p>
      </div>
    </div>
  );
}
