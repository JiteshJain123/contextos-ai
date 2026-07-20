import { notFound } from "next/navigation";

import type { ProjectDTO } from "@/lib/validators/project";

import { PlanPage } from "@/features/planner";
import { serverFetch } from "@/lib/server-api";

type Params = { slug: string };

/**
 * /projects/[slug]/plan — AI-powered project planner.
 *
 * Thin server shell: fetches the project ID and hands it to the
 * PlanPage client component which manages plan generation + editing.
 */
export default async function ProjectPlanPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;

  const project = await serverFetch<ProjectDTO>(`/projects/by-slug/${slug}`);
  if (!project) notFound();

  return <PlanPage projectId={project.id} />;
}
