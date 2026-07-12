"use client";

import type { ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";

import { QueryProvider } from "./query-provider";
import { ThemeProvider } from "./theme-provider";

/**
 * Root provider composition. Order matters:
 *
 *   ThemeProvider (outermost — paints with correct theme before child mounts)
 *     QueryProvider (provides cache to the whole tree)
 *       children
 *       Toaster (rendered as sibling — overlays content; not a provider)
 *
 * Add new providers BETWEEN existing ones based on what they depend on. Keep
 * this file as the single composition point so the tree shape is one-glance
 * readable.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        {children}
        <Toaster richColors closeButton />
      </QueryProvider>
    </ThemeProvider>
  );
}
