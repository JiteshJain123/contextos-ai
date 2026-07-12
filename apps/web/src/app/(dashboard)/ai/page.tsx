import type { Metadata } from "next";
import Link from "next/link";
import { Bot, ChevronRight, FolderKanban, Sparkles } from "lucide-react";
import * as motion from "motion/react-client";

import type { ProjectDTO } from "@contextos-ai/validators/project";

import { clientEnv } from "@/env/client";
import { serverFetch } from "@/lib/server-api";

export const metadata: Metadata = { title: "AI Assistant" };

type ProjectsEnvelope = { data: ProjectDTO[]; meta: unknown };

export default async function AiHubPage() {
  const envelope = await serverFetch<ProjectsEnvelope>("/projects?pageSize=50");
  const projects: ProjectDTO[] = Array.isArray(envelope)
    ? (envelope as unknown as ProjectDTO[])
    : ((envelope as unknown as { data: ProjectDTO[] } | null)?.data ?? []);

  return (
    <div className="relative flex flex-col gap-6 overflow-hidden p-4 sm:p-6">
      {/* Ambient gradient orbs */}
      <div
        className="pointer-events-none absolute -top-16 -left-16 size-80 rounded-full bg-primary/5 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -top-8 right-0 size-56 rounded-full bg-violet-500/5 blur-3xl"
        aria-hidden="true"
      />

      {/* Page header */}
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative flex flex-col gap-1.5"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-linear-to-br from-primary to-violet-500 shadow-sm shadow-primary/20">
            <Bot className="size-5 text-primary-foreground" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">AI Assistant</h1>
            <p className="text-sm text-muted-foreground">
              Select a project to open its AI chat.
            </p>
          </div>
        </div>
      </motion.header>

      {/* Project grid */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.08, ease: "easeOut" }}
        className="relative"
      >
        {projects.length === 0 ? (
          <div className="relative overflow-hidden rounded-2xl border border-dashed border-border px-6 py-16 text-center">
            <div
              className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent"
              aria-hidden="true"
            />
            <div className="relative flex flex-col items-center gap-4">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
                <Bot className="size-7 text-primary/70" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-base font-semibold">No projects yet</h3>
                <p className="mx-auto mt-1.5 max-w-xs text-sm text-muted-foreground">
                  Create a project first, then return here to start an AI conversation about it.
                </p>
              </div>
              <Link
                href="/projects"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:-translate-y-px"
              >
                <FolderKanban className="size-3.5" />
                Create a project
              </Link>
            </div>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p, i) => (
              <motion.li
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.05, ease: "easeOut" }}
              >
                <Link
                  href={`/projects/${p.slug}/ai` as never}
                  className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:border-primary/20 hover:shadow-md hover:-translate-y-0.5"
                >
                  {/* Card header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-primary/8 transition-colors group-hover:bg-primary/15">
                      <Bot className="size-3.5 text-primary/70 transition-colors group-hover:text-primary" aria-hidden="true" />
                    </div>
                    <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/20 transition-all group-hover:translate-x-0.5 group-hover:text-muted-foreground/50" />
                  </div>

                  {/* Name + slug */}
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-sm transition-colors group-hover:text-primary">
                      {p.name}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground/50">/{p.slug}</p>
                  </div>

                  {/* Description */}
                  {p.description && (
                    <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {p.description}
                    </p>
                  )}

                  {/* CTA */}
                  <div className="mt-auto flex items-center gap-1.5 pt-1">
                    <Sparkles className="size-3 text-primary/50" aria-hidden="true" />
                    <span className="text-[11px] text-muted-foreground/50">
                      Open AI chat →
                    </span>
                  </div>
                </Link>
              </motion.li>
            ))}
          </ul>
        )}
      </motion.div>

      {/* Footer hint */}
      {projects.length > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="relative text-xs text-muted-foreground/40"
        >
          Powered by {clientEnv.NEXT_PUBLIC_APP_NAME} · Gemini AI
        </motion.p>
      )}
    </div>
  );
}
