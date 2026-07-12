import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FolderPlus, Sparkles } from "lucide-react";
import * as motion from "motion/react-client";

import { Button } from "@/components/ui/button";
import { DashboardStats } from "./dashboard-stats";
import { ProjectHealthSummary } from "./project-health-summary";

export const metadata: Metadata = { title: "Dashboard" };

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Up late";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const greeting = getGreeting();

  return (
    <div className="relative flex flex-col gap-5 p-4 sm:p-6">
      {/* Ambient gradient orbs */}
      <div
        className="pointer-events-none absolute -top-16 -left-16 size-72 rounded-full bg-primary/5 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-0 right-0 size-56 rounded-full bg-violet-500/5 blur-3xl"
        aria-hidden="true"
      />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative flex flex-wrap items-start justify-between gap-3"
      >
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" aria-hidden="true" />
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              <span className="text-gradient-brand">{greeting}</span>
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening across your projects.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="default" size="sm" className="gap-1.5" asChild>
            <Link href="/projects">
              <FolderPlus className="size-3.5" />
              New project
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" asChild>
            <Link href="/projects">
              All projects
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1, ease: "easeOut" }}
        className="relative"
      >
        <DashboardStats />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.2, ease: "easeOut" }}
        className="relative"
      >
        <ProjectHealthSummary />
      </motion.div>
    </div>
  );
}
