import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FolderPlus } from "lucide-react";

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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {greeting} — here&apos;s what&apos;s happening across your projects.
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
      </div>

      <DashboardStats />

      <ProjectHealthSummary />
    </div>
  );
}
