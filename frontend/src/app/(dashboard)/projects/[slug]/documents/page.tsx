import type { Metadata } from "next";
import { notFound } from "next/navigation";

import type { ProjectDTO } from "@/lib/validators/project";

import { serverFetch } from "@/lib/server-api";
import { DocumentsPage } from "@/features/document";

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Documents — ${slug}` };
}

export default async function DocumentsRoute({ params }: { params: Promise<Params> }) {
  const { slug } = await params;

  const project = await serverFetch<ProjectDTO>(`/projects/by-slug/${slug}`);
  if (!project) notFound();

  return <DocumentsPage projectId={project.id} />;
}
