import type { Metadata } from "next";
import {
  Bot,
  Calendar,
  FileText,
  FolderKanban,
  Keyboard,
  Lightbulb,
  ListChecks,
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
    title: "1 · Create a project",
    description:
      "From the Projects page, create a project with a name and a short description of the goal. Every board, calendar, document, and AI conversation lives inside a project.",
  },
  {
    icon: ListChecks,
    title: "2 · Add tasks — by hand or from a document",
    description:
      "Add tasks directly on the Kanban board (press N on a project page for a new task), or upload a PDF/DOCX/TXT brief on the Documents tab and let AI analyse it and propose tasks you can import in one click.",
  },
  {
    icon: Bot,
    title: "3 · Let AI plan the work",
    description:
      "Open the AI Planner to generate a full roadmap with phases and scheduled tasks, or use AI Breakdown to split a single goal into estimated, categorised subtasks with dependencies.",
  },
  {
    icon: Calendar,
    title: "4 · Track on board, calendar, and timeline",
    description:
      "Drag tasks between columns on the board, reschedule by dragging on the calendar, and watch milestones on the Gantt timeline. Everything stays in sync.",
  },
  {
    icon: Lightbulb,
    title: "5 · Review insights and ask the assistant",
    description:
      "The Insights tab surfaces risks, bottlenecks, and health scores per project. The AI Assistant answers questions with full context of your tasks, documents, and project memory.",
  },
] as const;

const SHORTCUTS = [
  { keys: "Ctrl / ⌘ + K", action: "Open the command palette — jump to any page or project" },
  { keys: "N", action: "New task (on a project page)" },
  { keys: "Esc", action: "Close dialogs and menus" },
] as const;

export default function HelpPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />

      <main className="flex-1">
        <section className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
          <h1 className="text-3xl font-semibold tracking-tight">How to use ContextOS AI</h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            From an empty workspace to an AI-planned project in five steps.
          </p>

          <ol className="mt-8 space-y-4">
            {STEPS.map(({ icon: Icon, title, description }) => (
              <li key={title} className="rounded-lg border border-border bg-card p-5">
                <h2 className="flex items-center gap-2.5 text-sm font-semibold tracking-tight">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary">
                    <Icon className="size-4 text-primary" aria-hidden="true" />
                  </span>
                  {title}
                </h2>
                <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </li>
            ))}
          </ol>

          <h2 className="mt-12 flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Keyboard className="size-5 text-primary" aria-hidden="true" />
            Keyboard shortcuts
          </h2>
          <div className="mt-4 overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                {SHORTCUTS.map(({ keys, action }) => (
                  <tr key={keys}>
                    <td className="w-40 px-4 py-2.5">
                      <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">
                        {keys}
                      </kbd>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="mt-12 flex items-center gap-2 text-lg font-semibold tracking-tight">
            <FileText className="size-5 text-primary" aria-hidden="true" />
            Tips
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>
              Give projects a clear description — the AI uses it as context for planning
              and breakdowns.
            </li>
            <li>
              Upload specs and briefs early: analysed documents feed the assistant and the
              project memory.
            </li>
            <li>
              Export a project&apos;s tasks as CSV or Markdown from the project header any
              time you need to share status outside the app.
            </li>
            <li>
              Use the theme toggle in the topbar to switch between light, dark, and
              system.
            </li>
          </ul>

          <div className="mt-12">
            <Button asChild>
              <Link href="/signup">Get started free</Link>
            </Button>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
