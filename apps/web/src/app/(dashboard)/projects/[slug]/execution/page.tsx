import { notFound } from "next/navigation";

import type { ProjectDTO } from "@contextos-ai/validators/project";

import { ExecutionPage } from "@/features/execution";
import { serverFetch } from "@/lib/server-api";

type Params = { slug: string };

export default async function ProjectExecutionPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;

  const project = await serverFetch<ProjectDTO>(`/projects/by-slug/${slug}`);
  if (!project) notFound();

  return (
    <div className="p-4 sm:p-6">
      <ExecutionPage projectId={project.id} />
    </div>
  );
}
