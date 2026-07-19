import type { ReactNode } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";

/**
 * Dashboard layout.
 *
 * Auth is enforced by middleware.ts (clerkMiddleware + auth.protect()).
 * By the time this layout renders the user is guaranteed to be signed in.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
