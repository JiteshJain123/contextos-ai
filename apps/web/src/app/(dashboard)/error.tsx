"use client";

import { AlertCircle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Dashboard-scoped error boundary.
 *
 * Rendered inside the (dashboard) route group — the DashboardShell layout
 * (sidebar + topbar) stays mounted. Only the main content area shows the
 * error, so users can navigate to another page without a full reload.
 *
 * Override per-page with a more specific error.tsx if needed (e.g. an AI
 * page error that doesn't warrant blocking the whole dashboard).
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 px-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="size-6 text-destructive" aria-hidden="true" />
      </div>
      <div>
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="mt-1 text-sm text-muted-foreground max-w-sm">
          This page failed to load. Use the sidebar to navigate elsewhere, or
          try again.
          {error.digest && (
            <span className="mt-2 block font-mono text-xs text-muted-foreground/60">
              Error ID: {error.digest}
            </span>
          )}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={reset} className="gap-2">
        <RefreshCw className="size-3.5" aria-hidden="true" />
        Try again
      </Button>
    </div>
  );
}
