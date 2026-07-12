import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { ReactNode } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { serverFetch, BackendUnavailableError } from "@/lib/server-api";

type Me = { user: { id: string; role: "USER" | "ADMIN" } };

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  try {
    const me = await serverFetch<Me>("/auth/me");
    if (!me) {
      const h = await headers();
      const pathname = h.get("x-pathname") ?? "";
      const loginUrl = pathname
        ? `/login?redirect=${encodeURIComponent(pathname)}&auth_error=1`
        : "/login?auth_error=1";
      redirect(loginUrl);
    }
  } catch (err) {
    // redirect() throws a NEXT_REDIRECT error internally — re-throw it so
    // Next.js can actually perform the redirect instead of swallowing it.
    if (
      err !== null &&
      typeof err === "object" &&
      "digest" in err &&
      typeof (err as { digest: string }).digest === "string" &&
      (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw err;
    }

    if (err instanceof BackendUnavailableError) {
      // Backend temporarily unreachable — render shell in degraded mode.
    }
    // All other unexpected errors (5xx, rate-limit) — swallow and render.
  }
  return <DashboardShell>{children}</DashboardShell>;
}
