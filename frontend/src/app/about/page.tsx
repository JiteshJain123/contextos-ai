import type { Metadata } from "next";
import {
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
    title: "Frontend",
    description:
      "Next.js 16 App Router and React 19 with Tailwind CSS v4 and ShadCN UI (Radix). TanStack Query and Zustand for state, React Hook Form + Zod for forms, dnd-kit for the Kanban board, FullCalendar and Recharts for calendar and charts, and light/dark theming.",
  },
  {
    icon: Server,
    title: "Backend",
    description:
      "Express 5 in TypeScript with a strict controller → service → repository architecture, SSE streaming for AI responses, Zod-validated contracts, and Pino structured logging.",
  },
  {
    icon: Sparkles,
    title: "AI — Google Gemini",
    description:
      "Gemini behind a swappable provider interface, with streaming chat, roadmap planning, task breakdown, and 21 insight types. Agentic action detection lets the assistant create and update tasks directly from chat.",
  },
  {
    icon: Brain,
    title: "RAG & project memory",
    description:
      "Retrieval-augmented generation using Gemini text-embedding-004 vectors and cosine-similarity semantic search over a persistent project memory, injected as context so answers are grounded in your own project.",
  },
  {
    icon: FileText,
    title: "Document understanding",
    description:
      "Upload PDF, DOCX, or TXT briefs (Multer + Mammoth), analyse them with Gemini, and import the extracted tasks into a project in one click.",
  },
  {
    icon: Database,
    title: "Database",
    description:
      "PostgreSQL through Prisma with additive, zero-downtime migrations.",
  },
  {
    icon: Lock,
    title: "Auth & security",
    description:
      "Clerk authentication with Svix-verified webhook user sync, Helmet security headers, CORS allow-listing, and per-route rate limiting.",
  },
] as const;

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />

      <main className="flex-1">
        <section className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
          <h1 className="text-3xl font-semibold tracking-tight">About ContextOS AI</h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            ContextOS AI is an AI-powered project workspace. Instead of bolting a chatbot
            onto a task tracker, it gives the AI real context — your projects, tasks,
            documents, milestones, and a persistent project memory — so planning,
            breakdowns, and insights are grounded in what you&apos;re actually building.
          </p>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            Create a project, add tasks or upload a brief, and the assistant can generate
            a roadmap, split goals into scheduled tasks, flag risks before they bite, and
            answer questions about your own project like a teammate who has read
            everything.
          </p>

          <h2 className="mt-12 text-lg font-semibold tracking-tight">How it&apos;s built</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {STACK.map(({ icon: Icon, title, description }) => (
              <div key={title} className="rounded-lg border border-border bg-card p-5">
                <span className="flex size-9 items-center justify-center rounded-md bg-secondary">
                  <Icon className="size-4.5 text-primary" aria-hidden="true" />
                </span>
                <h3 className="mt-3 text-sm font-semibold tracking-tight">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap items-center gap-3">
            <Button asChild>
              <Link href="/signup">
                <Bot className="size-4" aria-hidden="true" />
                Try it free
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/help">See how it works</Link>
            </Button>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
