import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import type { ProjectDTO } from "@contextos-ai/validators/project";

import { DeleteProjectButton, EditProjectDialog } from "@/features/project";
import { CreateTaskDialog, ProjectMetricsBar } from "@/features/task";
import { serverFetch, BackendUnavailableError } from "@/lib/server-api";

import { ProjectTabNav } from "./project-tab-nav";

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: slug };
}

export default async function ProjectLayout({
  params,
  children,
}: {
  params: Promise<Params>;
  children: ReactNode;
}) {
  const { slug } = await params;

  let project: ProjectDTO | null;
  try {
    project = await serverFetch<ProjectDTO>(`/projects/by-slug/${slug}`);
  } catch (err) {
    if (err instanceof BackendUnavailableError) notFound();
    throw err;
  }
  if (!project) notFound();

  return (
    <div className="flex flex-col">
      {/* ── Header ── */}
      <div className="px-4 pt-4 pb-0 sm:px-6 sm:pt-5">
        <header className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-0.5 font-mono text-[11px] text-muted-foreground/60">
              <Link
                href="/projects"
                className="rounded px-1 py-0.5 transition-colors hover:bg-muted hover:text-foreground"
              >
                projects
              </Link>
              <span className="opacity-30">/</span>
              <span className="px-1 py-0.5 text-muted-foreground/50">{project.slug}</span>
            </div>
            <h1 className="mt-0.5 truncate text-xl font-semibold tracking-tight sm:text-2xl">
              {project.name}
            </h1>
            {project.description && (
              <p className="text-muted-foreground mt-1 max-w-2xl text-sm leading-relaxed">
                {project.description}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
            <CreateTaskDialog projectId={project.id} />
            <EditProjectDialog project={project} />
            <DeleteProjectButton projectId={project.id} projectName={project.name} />
          </div>
        </header>

        {/* ── Project metrics + progress bar ── */}
        <ProjectMetricsBar projectId={project.id} />
      </div>

      {/* ── Tab navigation — sticky below topbar ── */}
      <div className="sticky top-14 z-20 mt-3 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="px-4 sm:px-6">
          <ProjectTabNav slug={slug} />
        </div>
      </div>

      {/* ── Page content ── */}
      <div className="p-4 sm:p-6 pt-4">{children}</div>
    </div>
  );
}
