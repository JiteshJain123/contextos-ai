import { notFound } from "next/navigation";

import type { ProjectDTO } from "@/lib/validators/project";

import { KanbanBoard } from "@/features/task";
import { serverFetch } from "@/lib/server-api";

type Params = { slug: string };

/**
 * /projects/[slug] — Kanban board.
 *
 * The project header, tabs, and action buttons live in the parent layout.tsx.
 * This page only renders the board for the project.
 */
export default async function ProjectBoardPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;

  const project = await serverFetch<ProjectDTO>(`/projects/by-slug/${slug}`);
  if (!project) notFound();

  return <KanbanBoard projectId={project.id} />;
}
