import type { Metadata } from "next";
import {
  ArrowRight,
  Bot,
  Brain,
  Database,
  FileText,
  LayoutDashboard,
  Lock,
  Server,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About — ContextOS AI",
  description:
    "What ContextOS AI is, how it's built, and the technology behind it.",
};

const STACK = [
  {
    icon: LayoutDashboard,
    color: "from-primary to-blue-600",
    title: "Frontend",
    description:
      "Next.js 16 App Router and React 19 with Tailwind CSS v4 and ShadCN UI (Radix). TanStack Query and Zustand for state, React Hook Form + Zod for forms, dnd-kit for the Kanban board, FullCalendar and Recharts for calendar and charts, and light/dark theming.",
  },
  {
    icon: Server,
    color: "from-slate-500 to-slate-700",
    title: "Backend",
    description:
      "Express 5 in TypeScript with a strict controller → service → repository architecture, SSE streaming for AI responses, Zod-validated contracts, and Pino structured logging.",
  },
  {
    icon: Sparkles,
    color: "from-violet-500 to-purple-600",
    title: "AI — Google Gemini",
    description:
      "Gemini behind a swappable provider interface, with streaming chat, roadmap planning, task breakdown, and 21 insight types. Agentic action detection lets the assistant create and update tasks directly from chat.",
  },
  {
    icon: Brain,
    color: "from-fuchsia-500 to-pink-600",
    title: "RAG & project memory",
    description:
      "Retrieval-augmented generation using Gemini text-embedding-004 vectors and cosine-similarity semantic search over a persistent project memory, injected as context so answers are grounded in your own project.",
  },
  {
    icon: FileText,
    color: "from-rose-500 to-orange-500",
    title: "Document understanding",
    description:
      "Upload PDF, DOCX, or TXT briefs (Multer + Mammoth), analyse them with Gemini, and import the extracted tasks into a project in one click.",
  },
  {
    icon: Database,
    color: "from-emerald-500 to-teal-600",
    title: "Database",
    description:
      "PostgreSQL through Prisma with additive, zero-downtime migrations.",
  },
  {
    icon: Lock,
    color: "from-amber-500 to-orange-600",
    title: "Auth & security",
    description:
      "Clerk authentication with Svix-verified webhook user sync, Helmet security headers, CORS allow-listing, and per-route rate limiting.",
  },
] as const;

const NUMBERS = [
  { value: "12", label: "Backend modules" },
  { value: "21", label: "AI insight types" },
  { value: "4", label: "Ways to view work" },
  { value: "1-click", label: "Doc → tasks import" },
] as const;

export default function AboutPage() {
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
              <Bot className="size-3.5" aria-hidden="true" />
              About the project
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
              An AI that actually{" "}
              <span className="bg-gradient-to-r from-primary via-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
                knows your project
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              ContextOS AI is an AI-powered project workspace. Instead of bolting a chatbot onto a
              task tracker, it gives the AI real context — your projects, tasks, documents,
              milestones, and a persistent project memory — so planning, breakdowns, and insights
              are grounded in what you&apos;re actually building.
            </p>
          </div>
        </section>

        {/* ── Numbers band ───────────────────────────────────── */}
        <section className="mx-auto w-full max-w-4xl px-4 sm:px-6">
          <div className="grid grid-cols-2 gap-4 rounded-2xl border border-border bg-muted/30 p-6 sm:grid-cols-4 sm:p-8">
            {NUMBERS.map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl">
                  {value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Story ──────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
          <p className="text-base leading-relaxed text-muted-foreground">
            Create a project, add tasks or upload a brief, and the assistant can generate a roadmap,
            split goals into scheduled tasks, flag risks before they bite, and answer questions about
            your own project like a teammate who has read everything.
          </p>
        </section>

        {/* ── Stack grid ─────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-5xl px-4 pb-20 sm:px-6">
          <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
            How it&apos;s built
          </h2>
          <p className="mx-auto mt-3 max-w-md text-center text-sm text-muted-foreground sm:text-base">
            A modern, production-grade stack from database to pixels.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {STACK.map(({ icon: Icon, color, title, description }) => (
              <div
                key={title}
                className="group rounded-xl border border-border bg-card p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${color} shadow-sm`}
                  >
                    <Icon className="size-5 text-white" aria-hidden="true" />
                  </span>
                  <h3 className="text-base font-semibold tracking-tight">{title}</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-14 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" asChild className="shadow-lg shadow-primary/30">
              <Link href="/signup">
                Try it free
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/help">See how it works</Link>
            </Button>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
