import type { Metadata } from "next";
import * as motion from "motion/react-client";

import { CreateProjectDialog, ProjectList } from "@/features/project";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  return (
    <div className="relative flex flex-col gap-6 p-4 sm:p-6">
      {/* Ambient gradient */}
      <div
        className="pointer-events-none absolute -top-16 -left-16 size-72 rounded-full bg-primary/5 blur-3xl"
        aria-hidden="true"
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative flex flex-wrap items-center justify-between gap-3"
      >
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            <span className="text-gradient-brand">Projects</span>
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">Organize your work into projects.</p>
        </div>
        <CreateProjectDialog />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.08, ease: "easeOut" }}
        className="relative"
      >
        <ProjectList />
      </motion.div>
    </div>
  );
}
