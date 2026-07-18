"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps, ReactNode } from "react";

/**
 * Light / dark / system theme via next-themes.
 *
 * Why next-themes (not a custom impl):
 *   - Handles SSR-hydration flash (sets `class="dark"` before paint via inline script)
 *   - Persists user choice to localStorage
 *   - Listens to system preference changes
 *
 * The root <html> tag gets `class="dark"` toggled. Our globals.css listens
 * via `.dark` selectors to swap the ShadCN semantic color tokens.
 */
type ThemeProviderProps = ComponentProps<typeof NextThemesProvider>;

export function ThemeProvider({
  children,
  ...props
}: { children: ReactNode } & Partial<ThemeProviderProps>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
