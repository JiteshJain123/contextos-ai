import { notFound } from "next/navigation";

import type { ProjectDTO } from "@contextos-ai/validators/project";

import { AiChatPanel } from "@/features/ai";
import { serverFetch } from "@/lib/server-api";

type Params = { slug: string };

/**
 * /projects/[slug]/ai — project-scoped AI assistant.
 *
 * Thin server shell: fetches the project ID and hands it to the
 * AiChatPanel client component which manages conversations + streaming.
 */
export default async function ProjectAiPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;

  const project = await serverFetch<ProjectDTO>(`/projects/by-slug/${slug}`);
  if (!project) notFound();

  return (
    <div className="h-[calc(100svh-300px)] min-h-[380px] overflow-hidden sm:h-[calc(100svh-240px)] lg:h-[calc(100vh-200px)]">
      <AiChatPanel projectId={project.id} />
    </div>
  );
}
