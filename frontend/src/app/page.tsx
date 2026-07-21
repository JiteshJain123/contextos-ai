import type { Metadata } from "next";
import Link from "next/link";
import {
  Brain,
  Kanban,
  Calendar,
  Lightbulb,
  ArrowRight,
} from "lucide-react";

import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "ContextOS AI — AI project workspace",
  description:
    "Plan, track and ship projects with an AI that knows your context.",
};

const FEATURES = [
  {
    icon: Brain,
    title: "AI plans & breakdowns",
    description:
      "Turn a goal or document into a structured project plan and task list automatically.",
  },
  {
    icon: Kanban,
    title: "Boards & tasks",
    description:
      "Organize work on Kanban boards with priorities, statuses and drag-and-drop.",
  },
  {
    icon: Calendar,
    title: "Calendar & timeline",
    description:
      "See deadlines and milestones across projects in calendar and timeline views.",
  },
  {
    icon: Lightbulb,
    title: "Insights",
    description:
      "Surface risks, blockers and progress trends before they become problems.",
  },
] as const;

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />

      {/* ── Hero ───────────────────────────────────────────────── */}
      <main className="flex-1">
        <section className="mx-auto w-full max-w-5xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            The AI workspace for your projects
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            Plan, track and ship your work with an AI that understands your
            documents, tasks and context — all in one place.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/signup">
                Start free
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </section>

        {/* ── Features ─────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-5xl px-4 pb-24 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-lg border border-border bg-card p-5 text-left"
              >
                <span className="flex size-9 items-center justify-center rounded-md bg-secondary">
                  <Icon className="size-4.5 text-primary" aria-hidden="true" />
                </span>
                <h2 className="mt-3 text-sm font-semibold tracking-tight">{title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
