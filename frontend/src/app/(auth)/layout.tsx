import { Bot, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

const HIGHLIGHTS = [
  "AI-generated project plans and task breakdowns",
  "Kanban boards, calendar and timeline views",
  "Insights that surface risks before they bite",
] as const;

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* ── Brand panel (desktop only) ─────────────────────────────── */}
      <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-zinc-950 p-10 text-zinc-50 lg:flex">
        {/* Subtle grid backdrop */}
        <div
          aria-hidden="true"
          className="absolute inset-0 [background-image:linear-gradient(to_right,rgb(255_255_255/0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.04)_1px,transparent_1px)] [background-size:44px_44px]"
        />
        <div
          aria-hidden="true"
          className="absolute -top-32 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-indigo-600/20 blur-3xl"
        />

        <Link href="/" className="relative flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-600">
            <Bot className="size-4.5 text-white" aria-hidden="true" />
          </div>
          <span className="text-base font-semibold tracking-tight">ContextOS AI</span>
        </Link>

        <div className="relative max-w-md">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">
            Plan, track and ship projects with an AI that knows your context.
          </h1>
          <ul className="mt-8 space-y-3">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-zinc-300">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-indigo-400" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-zinc-500">
          © {new Date().getFullYear()} ContextOS AI
        </p>
      </aside>

      {/* ── Auth form ──────────────────────────────────────────────── */}
      <main className="flex flex-1 flex-col items-center justify-center bg-zinc-50 p-6 dark:bg-background">
        {/* Mobile-only logo */}
        <Link href="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
          <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-600">
            <Bot className="size-4.5 text-white" aria-hidden="true" />
          </div>
          <span className="text-base font-semibold tracking-tight">ContextOS AI</span>
        </Link>
        {children}
      </main>
    </div>
  );
}
