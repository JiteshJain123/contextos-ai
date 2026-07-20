import { notFound } from "next/navigation";

import type { ProjectDTO } from "@/lib/validators/project";

import { BreakdownPage } from "@/features/breakdown";
import { serverFetch } from "@/lib/server-api";

type Params = { slug: string };

export default async function ProjectBreakdownPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;

  const project = await serverFetch<ProjectDTO>(`/projects/by-slug/${slug}`);
  if (!project) notFound();

  return <BreakdownPage projectId={project.id} slug={slug} />;
}
