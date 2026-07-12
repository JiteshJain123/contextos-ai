import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { clientEnv } from "@/env/client";
import { Providers } from "@/providers";

import "./globals.css";

/**
 * Root layout.
 *
 * Server Component (no "use client") — it stays out of the browser bundle.
 * The Providers tree is mounted via a Client Component boundary inside
 * <Providers>, so we keep SSR fast and minimize hydration cost.
 *
 * `suppressHydrationWarning` on <html> is required by next-themes — the
 * theme class is set by a tiny inline script before paint, which would
 * otherwise trigger a hydration mismatch warning.
 */
export const metadata: Metadata = {
  title: {
    default: clientEnv.NEXT_PUBLIC_APP_NAME,
    template: `%s | ${clientEnv.NEXT_PUBLIC_APP_NAME}`,
  },
  description: "Production-grade AI SaaS.",
  metadataBase: new URL(clientEnv.NEXT_PUBLIC_APP_URL),
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground min-h-screen antialiased" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
