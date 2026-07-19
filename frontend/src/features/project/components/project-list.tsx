"use client";

import { FolderOpen } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { useProjects } from "../hooks/use-projects";
import { CreateProjectDialog } from "./create-project-dialog";
import { ProjectCard } from "./project-card";

export function ProjectList() {
  const query = useProjects({ pageSize: 50 });

  if (query.isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <ProjectCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (query.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Couldn&apos;t load projects</AlertTitle>
        <AlertDescription>
          {query.error instanceof Error ? query.error.message : "Unknown error"}
        </AlertDescription>
      </Alert>
    );
  }

  const projects = query.data?.data ?? [];
  if (projects.length === 0) return <EmptyState />;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((p) => (
        <ProjectCard key={p.id} project={p} />
      ))}
    </div>
  );
}

// ─── Shimmer skeleton ─────────────────────────────────────────────────────────

function ProjectCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-1.5">
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted/50" />
          </div>
          <div className="h-3 w-8 animate-pulse rounded bg-muted/50" />
        </div>
        <div className="space-y-1.5">
          <div className="h-3 w-full animate-pulse rounded bg-muted/60" />
          <div className="h-3 w-4/5 animate-pulse rounded bg-muted/60" />
        </div>
        <div className="space-y-2 pt-1">
          <div className="h-1 w-full animate-pulse rounded-full bg-muted" />
          <div className="flex justify-between">
            <div className="h-3 w-16 animate-pulse rounded bg-muted/50" />
            <div className="h-3 w-8 animate-pulse rounded bg-muted/50" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-border py-16 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="flex size-12 items-center justify-center rounded-lg bg-muted">
          <FolderOpen className="size-6 text-muted-foreground" aria-hidden="true" />
        </div>

        <div>
          <h3 className="text-base font-semibold">Create your first project</h3>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
            Projects organize your tasks, AI insights, and roadmap. Each one gets a Kanban board,
            an AI planner, and execution reports.
          </p>
        </div>

        <CreateProjectDialog />
      </div>
    </div>
  );
}
