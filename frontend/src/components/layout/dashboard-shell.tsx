"use client";

import {
  Bot,
  CircleHelp,
  FolderKanban,
  LayoutDashboard,
  PanelLeft,
  Settings,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useState } from "react";

import { CommandPalette } from "@/components/command-palette";
import { NotificationsBell } from "@/components/notifications-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoutButton } from "@/features/auth";
import { clientEnv } from "@/env/client";
import { useLocalStorageFlag } from "@/lib/client-prefs";
import { cn } from "@/lib/cn";

// Stored as "closed" so the default (nothing stored → false) is open.
const SIDEBAR_CLOSED_KEY = "contextos:sidebar-closed";

export function DashboardShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopClosed, setDesktopClosed] = useLocalStorageFlag(SIDEBAR_CLOSED_KEY);

  return (
    <div className="bg-background flex min-h-screen">
      {/* -- Desktop sidebar (fully hidden when closed) --------------------- */}
      <aside
        className={cn(
          "border-border bg-muted/30 hidden w-60 shrink-0 flex-col border-r md:flex",
          desktopClosed && "md:hidden",
        )}
      >
        <BrandHeader />
        <div className="flex flex-1 flex-col">
          <SidebarNavLinks />
          <SidebarFooter />
        </div>
      </aside>

      {/* -- Mobile overlay drawer ------------------------------------------ */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-foreground/20 md:hidden"
            aria-hidden="true"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="border-border bg-background fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r md:hidden">
            <div className="border-border flex h-14 items-center justify-between border-b px-4">
              <div className="flex items-center gap-2">
                <div className="flex size-6 items-center justify-center rounded-md bg-primary">
                  <Bot className="size-3.5 text-primary-foreground" aria-hidden="true" />
                </div>
                <span className="text-sm font-semibold tracking-tight">
                  {clientEnv.NEXT_PUBLIC_APP_NAME}
                </span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation menu"
                className="text-muted-foreground hover:text-foreground rounded-md p-1 transition-colors hover:bg-muted"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <SidebarNavLinks onNavigate={() => setMobileOpen(false)} />
          </aside>
        </>
      )}

      {/* -- Main area ------------------------------------------------------ */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="border-border bg-background sticky top-0 z-30 flex h-14 items-center justify-between border-b px-4">
          {/* Mobile: open the overlay drawer */}
          <button
            className="text-muted-foreground hover:text-foreground mr-1 rounded-md p-1.5 transition-colors hover:bg-muted md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={mobileOpen}
          >
            <PanelLeft className="size-5" aria-hidden="true" />
          </button>

          {/* Desktop: fully open/close the sidebar */}
          <button
            className="text-muted-foreground hover:text-foreground mr-1 hidden rounded-md p-1.5 transition-colors hover:bg-muted md:inline-flex"
            onClick={() => setDesktopClosed(!desktopClosed)}
            aria-label={desktopClosed ? "Open sidebar" : "Close sidebar"}
            aria-expanded={!desktopClosed}
            title={desktopClosed ? "Open sidebar" : "Close sidebar"}
          >
            <PanelLeft className="size-5" aria-hidden="true" />
          </button>

          <span className="text-sm font-semibold tracking-tight md:hidden">
            {clientEnv.NEXT_PUBLIC_APP_NAME}
          </span>

          <PageTitle />

          <div className="ml-auto flex items-center gap-1">
            <CommandPalette />
            <NotificationsBell />
            <ThemeToggle />
            <LogoutButton />
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

/**
 * Topbar page title derived from the current route so users always know
 * where they are. For project sub-pages it shows the section name.
 */
const SEGMENT_TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  projects: "Projects",
  ai: "AI Assistant",
  settings: "Settings",
  board: "Board",
  calendar: "Calendar",
  timeline: "Timeline",
  documents: "Documents",
  insights: "Insights",
  memory: "Memory",
  plan: "Plan",
  planner: "AI Planner",
  breakdown: "AI Breakdown",
  execution: "Execution",
};

function PageTitle() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0] ?? "";
  const last = segments[segments.length - 1] ?? "";

  // /projects/[slug]/... → "Projects / <Section>"; otherwise the top-level name
  const section = SEGMENT_TITLES[last];
  const root = SEGMENT_TITLES[first];
  if (!root) return null;

  return (
    <div className="hidden items-center gap-1.5 text-sm md:flex">
      <span className="font-semibold tracking-tight">{root}</span>
      {segments.length > 1 && section && section !== root && (
        <>
          <span className="text-muted-foreground/40">/</span>
          <span className="text-muted-foreground">{section}</span>
        </>
      )}
    </div>
  );
}

function BrandHeader() {
  return (
    <div className="border-border flex h-14 items-center border-b px-4">
      <div className="flex items-center gap-2.5">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary">
          <Bot className="size-4 text-primary-foreground" aria-hidden="true" />
        </div>
        <span className="text-sm font-semibold tracking-tight">
          {clientEnv.NEXT_PUBLIC_APP_NAME}
        </span>
      </div>
    </div>
  );
}

function SidebarFooter() {
  return (
    <div className="mt-auto border-t border-border px-4 py-3">
      <span className="text-[11px] text-muted-foreground">Powered by Gemini AI</span>
    </div>
  );
}

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="size-4" aria-hidden="true" />,
  },
  {
    href: "/projects",
    label: "Projects",
    icon: <FolderKanban className="size-4" aria-hidden="true" />,
  },
  {
    href: "/ai",
    label: "AI Assistant",
    icon: <Bot className="size-4" aria-hidden="true" />,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: <Settings className="size-4" aria-hidden="true" />,
  },
  {
    href: "/help",
    label: "Help",
    icon: <CircleHelp className="size-4" aria-hidden="true" />,
  },
] as const;

function SidebarNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5 p-3" aria-label="Main navigation">
      <p className="px-3 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
        Workspace
      </p>
      {NAV_ITEMS.map((item) => (
        <SidebarLink
          key={item.href}
          href={item.href}
          icon={item.icon}
          isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)}
          onClick={onNavigate}
        >
          {item.label}
        </SidebarLink>
      ))}
    </nav>
  );
}

function SidebarLink({
  href,
  icon,
  children,
  isActive,
  onClick,
}: {
  href: string;
  icon: ReactNode;
  children: ReactNode;
  isActive: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href as never}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      <span className={isActive ? "text-primary" : ""}>{icon}</span>
      <span>{children}</span>
    </Link>
  );
}
