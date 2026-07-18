"use client";

import { AlertTriangle } from "lucide-react";

export default function RootError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 overflow-hidden px-4">
      {/* Ambient blob */}
      <div
        className="pointer-events-none absolute -top-32 left-1/2 size-80 -translate-x-1/2 rounded-full bg-destructive/5 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative flex flex-col items-center gap-5 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-destructive/10 shadow-sm">
          <AlertTriangle className="size-7 text-destructive/70" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Something went wrong</h2>
          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
            An unexpected error occurred. Please try again or refresh the page.
          </p>
        </div>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md hover:-translate-y-px active:scale-[0.98]"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
