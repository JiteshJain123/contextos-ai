import { Bot } from "lucide-react";
import type { ReactNode } from "react";

import { clientEnv } from "@/env/client";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-background via-background to-muted/40 p-4">
      {/* Ambient gradient orbs */}
      <div
        className="pointer-events-none absolute -top-40 -left-40 size-96 rounded-full bg-primary/8 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-40 size-80 rounded-full bg-violet-500/6 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 size-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/4 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-7">
        {/* Brand logo */}
        <div className="flex flex-col items-center gap-2.5">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-violet-500 shadow-lg shadow-primary/25">
            <Bot className="size-5 text-primary-foreground" aria-hidden="true" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-foreground/80">
            {clientEnv.NEXT_PUBLIC_APP_NAME}
          </span>
        </div>

        {/* Card */}
        <div className="w-full rounded-2xl border border-border/70 bg-card p-8 shadow-xl shadow-black/5 dark:shadow-black/20">
          {children}
        </div>
      </div>
    </div>
  );
}
