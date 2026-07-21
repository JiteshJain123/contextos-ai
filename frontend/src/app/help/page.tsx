import type { Metadata } from "next";
import {
  ArrowRight,
  Bot,
  Calendar,
  FileText,
  FolderKanban,
  Keyboard,
  Lightbulb,
  ListChecks,
  Moon,
  Rocket,
  Upload,
} from "lucide-react";
import Link from "next/link";

import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "How to use — ContextOS AI",
  description: "A step-by-step guide to planning and shipping projects with ContextOS AI.",
};

const STEPS = [
  {
    icon: FolderKanban,
    color: "from-primary to-blue-600",
    title: "Create a project",
    description:
      "From the Projects page, create a project with a name and a short description of the goal. Every board, calendar, document, and AI conversation lives inside a project.",
  },
  {
    icon: ListChecks,
    color: "from-emerald-500 to-teal-600",
    title: "Add tasks — by hand or from a document",
    description:
      "Add tasks directly on the Kanban board (press N on a project page for a new task), or upload a PDF/DOCX/TXT brief on the Documents tab and let AI analyse it and propose tasks you can import in one click.",
  },
  {
    icon: Bot,
    color: "from-violet-500 to-purple-600",
    title: "Let AI plan the work",
    description:
      "Open the AI Planner to generate a full roadmap with phases and scheduled tasks, or use AI Breakdown to split a single goal into estimated, categorised subtasks with dependencies.",
  },
  {
    icon: Calendar,
    color: "from-amber-500 to-orange-600",
    title: "Track on board, calendar, and timeline",
    description:
      "Drag tasks between columns on the board, reschedule by dragging on the calendar, and watch milestones on the Gantt timeline. Everything stays in sync.",
  },
  {
    icon: Lightbulb,
    color: "from-rose-500 to-pink-600",
    title: "Review insights and ask the assistant",
    description:
      "The Insights tab surfaces risks, bottlenecks, and health scores per project. The AI Assistant answers questions with full context of your tasks, documents, and project memory.",
  },
] as const;

const SHORTCUTS = [
  { keys: ["Ctrl / ⌘", "K"], action: "Open the command palette — jump to any page or project" },
  { keys: ["N"], action: "New task (on a project page)" },
  { keys: ["Esc"], action: "Close dialogs and menus" },
] as const;

const TIPS = [
  {
    icon: FileText,
    title: "Describe your projects well",
    text: "The AI uses the project description as context for planning and breakdowns — a clear goal produces a better roadmap.",
  },
  {
    icon: Upload,
    title: "Upload briefs early",
    text: "Analysed documents feed the assistant and the project memory, so answers get sharper as you add material.",
  },
  {
    icon: Rocket,
    title: "Export any time",
    text: "Download a project's tasks as CSV or Markdown from the project header to share status outside the app.",
  },
  {
    icon: Moon,
    title: "Make it yours",
    text: "Use the theme toggle in the topbar to switch between light, dark, and system.",
  },
] as const;

export default function HelpPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />

      <main className="flex-1">
        {/* ── Hero ───────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_50%_-5%,color-mix(in_oklab,var(--primary)_16%,transparent),transparent)]"
          />
          <div className="relative mx-auto w-full max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-24">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Rocket className="size-3.5" aria-hidden="true" />
              Getting started
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
              From empty workspace to{" "}
              <span className="bg-gradient-to-r from-primary via-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
                AI-planned project
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Five steps. A few minutes. Here&apos;s exactly how to use ContextOS AI.
            </p>
          </div>
        </section>

        {/* ── Steps ──────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-3xl px-4 sm:px-6">
          <ol className="relative space-y-6">
            {/* Connector line */}
            <div
              aria-hidden="true"
              className="absolute bottom-8 left-[27px] top-8 w-px bg-gradient-to-b from-primary/50 via-border to-border"
            />
            {STEPS.map(({ icon: Icon, color, title, description }, index) => (
              <li
                key={title}
                className="relative flex gap-5 rounded-xl border border-border bg-card p-6 transition-all duration-200 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="relative flex flex-col items-center">
                  <span
                    className={`flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${color} shadow-sm`}
                  >
                    <Icon className="size-5 text-white" aria-hidden="true" />
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-primary">
                    Step {index + 1}
                  </p>
                  <h2 className="mt-0.5 text-base font-semibold tracking-tight">{title}</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Shortcuts ──────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-3xl px-4 pt-16 sm:px-6">
          <h2 className="flex items-center justify-center gap-2 text-2xl font-bold tracking-tight">
            <Keyboard className="size-6 text-primary" aria-hidden="true" />
            Keyboard shortcuts
          </h2>
          <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
            {SHORTCUTS.map(({ keys, action }, i) => (
              <div
                key={action}
                className={`flex items-center gap-4 px-5 py-3.5 ${i > 0 ? "border-t border-border" : ""}`}
              >
                <span className="flex w-36 shrink-0 items-center gap-1">
                  {keys.map((k) => (
                    <kbd
                      key={k}
                      className="rounded-md border border-border bg-muted px-2 py-1 font-mono text-xs font-medium shadow-[inset_0_-1px_0_var(--border)]"
                    >
                      {k}
                    </kbd>
                  ))}
                </span>
                <span className="text-sm text-muted-foreground">{action}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Tips ───────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6">
          <h2 className="text-center text-2xl font-bold tracking-tight">Pro tips</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {TIPS.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="size-4 text-primary" aria-hidden="true" />
                  </span>
                  <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
                </div>
                <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-14 text-center">
            <Button size="lg" asChild className="shadow-lg shadow-primary/30">
              <Link href="/signup">
                Get started free
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
