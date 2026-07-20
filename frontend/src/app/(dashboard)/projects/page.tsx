import type { Metadata } from "next";

import { CreateProjectDialog, ProjectList } from "@/features/project";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">Organize your work into projects.</p>
        </div>
        <CreateProjectDialog />
      </div>

      <ProjectList />
    </div>
  );
}
