import type { Metadata } from "next";
import Link from "next/link";
import { Bot, ChevronRight, FolderKanban } from "lucide-react";

import type { ProjectDTO } from "@/lib/validators/project";

import { serverFetch } from "@/lib/server-api";

export const metadata: Metadata = { title: "AI Assistant" };

type ProjectsEnvelope = { data: ProjectDTO[]; meta: unknown };

export default async function AiHubPage() {
  const envelope = await serverFetch<ProjectsEnvelope>("/projects?pageSize=50");
  const projects: ProjectDTO[] = Array.isArray(envelope)
    ? (envelope as unknown as ProjectDTO[])
    : ((envelope as unknown as { data: ProjectDTO[] } | null)?.data ?? []);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {/* Page header */}
      <header
        className="flex flex-col gap-1"
      >
        <h1 className="text-2xl font-semibold tracking-tight">AI Assistant</h1>
        <p className="text-sm text-muted-foreground">
          Select a project to open its AI chat.
        </p>
      </header>

      {/* Project grid */}
      <div
        className="relative"
      >
        {projects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-6 py-16 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-lg bg-muted">
                <Bot className="size-6 text-muted-foreground" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-base font-semibold">No projects yet</h3>
                <p className="mx-auto mt-1.5 max-w-xs text-sm text-muted-foreground">
                  Create a project first, then return here to start an AI conversation about it.
                </p>
              </div>
              <Link
                href="/projects"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <FolderKanban className="size-3.5" />
                Create a project
              </Link>
            </div>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.slug}/ai` as never}
                  className="group flex h-full flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex size-8 items-center justify-center rounded-md bg-muted">
                      <Bot className="size-4 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground/40" />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold group-hover:text-primary">
                      {p.name}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">/{p.slug}</p>
                  </div>

                  {p.description && (
                    <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {p.description}
                    </p>
                  )}

                  <span className="mt-auto pt-1 text-xs text-muted-foreground">Open AI chat →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
