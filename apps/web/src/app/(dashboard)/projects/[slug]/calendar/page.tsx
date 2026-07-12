import type { Metadata } from "next";
import { notFound } from "next/navigation";

import type { ProjectDTO } from "@contextos-ai/validators/project";

import { serverFetch } from "@/lib/server-api";
import { CalendarPage } from "@/features/calendar/components/calendar-page";

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Calendar — ${slug}` };
}

export default async function CalendarRoute({ params }: { params: Promise<Params> }) {
  const { slug } = await params;

  const project = await serverFetch<ProjectDTO>(`/projects/by-slug/${slug}`);
  if (!project) notFound();

  return <CalendarPage projectId={project.id} />;
}
