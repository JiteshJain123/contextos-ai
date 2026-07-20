import { notFound } from "next/navigation";

import type { ProjectDTO } from "@/lib/validators/project";

import { InsightsPage } from "@/features/insights";
import { serverFetch } from "@/lib/server-api";

type Params = { slug: string };

/**
 * /projects/[slug]/insights — AI Smart Execution Assistant.
 *
 * Thin server shell: fetches project ID and passes it to the
 * InsightsPage client component which manages all 7 AI insight cards.
 */
export default async function ProjectInsightsPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;

  const project = await serverFetch<ProjectDTO>(`/projects/by-slug/${slug}`);
  if (!project) notFound();

  return <InsightsPage projectId={project.id} />;
}
