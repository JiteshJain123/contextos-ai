import type { Metadata } from "next";
import {
  ArrowRight,
  Brain,
  Calendar,
  FileText,
  Kanban,
  Lightbulb,
  MessageSquare,
  Sparkles,
  Zap,
} from "lucide-react";
import Link from "next/link";

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
    color: "from-violet-500 to-purple-600",
    title: "AI plans & breakdowns",
    description:
      "Turn a goal or document into a structured project plan and task list automatically.",
  },
  {
    icon: Kanban,
    color: "from-primary to-blue-600",
    title: "Boards & tasks",
    description:
      "Organize work on Kanban boards with priorities, statuses and drag-and-drop.",
  },
  {
    icon: Calendar,
    color: "from-emerald-500 to-teal-600",
    title: "Calendar & timeline",
    description:
      "See deadlines and milestones across projects in calendar and timeline views.",
  },
  {
    icon: Lightbulb,
    color: "from-amber-500 to-orange-600",
    title: "Insights",
    description:
      "Surface risks, blockers and progress trends before they become problems.",
  },
  {
    icon: FileText,
    color: "from-rose-500 to-pink-600",
    title: "Documents to tasks",
    description:
      "Upload a brief — the AI reads it and proposes tasks you can import in one click.",
  },
  {
    icon: MessageSquare,
    color: "from-cyan-500 to-sky-600",
    title: "Context-aware chat",
    description:
      "Ask anything about your project and get answers grounded in your own work.",
  },
] as const;

const STEPS = [
  { step: "01", title: "Create a project", text: "Give it a name and a goal." },
  { step: "02", title: "Add or import tasks", text: "By hand, or let AI extract them from a document." },
  { step: "03", title: "Let AI plan it", text: "Generate a roadmap with phases and scheduled tasks." },
  { step: "04", title: "Track & ship", text: "Board, calendar, timeline and insights keep you on course." },
] as const;

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />

      <main className="flex-1">
        {/* ── Hero ───────────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          {/* Glow + grid backdrop */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,color-mix(in_oklab,var(--primary)_18%,transparent),transparent)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--border)_45%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--border)_45%,transparent)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_65%_55%_at_50%_0%,black,transparent)]"
          />

          <div className="relative mx-auto w-full max-w-6xl px-4 py-24 text-center sm:px-6 sm:py-32">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="size-3.5" aria-hidden="true" />
              Powered by Google Gemini + RAG
            </span>

            <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
              The AI workspace for{" "}
              <span className="bg-gradient-to-r from-primary via-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
                your projects
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Plan, track and ship your work with an AI that understands your
              documents, tasks and context — all in one place.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" asChild className="shadow-lg shadow-primary/30">
                <Link href="/signup">
                  Start free
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/help">See how it works</Link>
              </Button>
            </div>

            {/* Quick stat chips */}
            <div className="mx-auto mt-14 flex max-w-2xl flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Zap className="size-4 text-primary" aria-hidden="true" /> Streaming AI responses
              </span>
              <span className="flex items-center gap-2">
                <Brain className="size-4 text-primary" aria-hidden="true" /> Persistent project memory
              </span>
              <span className="flex items-center gap-2">
                <FileText className="size-4 text-primary" aria-hidden="true" /> PDF &amp; DOCX understanding
              </span>
            </div>
          </div>
        </section>

        {/* ── Features ─────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Everything your project needs
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground sm:text-base">
              A complete workspace where the AI is a teammate — not a gimmick.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, color, title, description }) => (
              <div
                key={title}
                className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
              >
                <span
                  className={`flex size-10 items-center justify-center rounded-lg bg-gradient-to-br ${color} shadow-sm`}
                >
                  <Icon className="size-5 text-white" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-base font-semibold tracking-tight">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it works strip ───────────────────────────────── */}
        <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <div className="rounded-2xl border border-border bg-muted/30 p-8 sm:p-12">
            <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
              From idea to shipped in four steps
            </h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map(({ step, title, text }) => (
                <div key={step} className="relative">
                  <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text font-mono text-3xl font-bold text-transparent">
                    {step}
                  </span>
                  <h3 className="mt-2 text-sm font-semibold tracking-tight">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA band ─────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-violet-600 to-fuchsia-600 p-10 text-center sm:p-14">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_50%_0%,rgba(255,255,255,0.25),transparent)]"
            />
            <h2 className="relative text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Ready to plan your next project with AI?
            </h2>
            <p className="relative mx-auto mt-3 max-w-md text-sm text-white/85 sm:text-base">
              Free to start — bring a Gemini API key and go from goal to roadmap in minutes.
            </p>
            <div className="relative mt-8">
              <Button
                size="lg"
                asChild
                className="bg-white text-primary shadow-lg hover:bg-white/90"
              >
                <Link href="/signup">
                  Get started free
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
