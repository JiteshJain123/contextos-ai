"use client";

import { motion, AnimatePresence } from "motion/react";
import { Bot, Cpu, FolderKanban, LayoutDashboard, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useState } from "react";

import { LogoutButton } from "@/features/auth";
import { clientEnv } from "@/env/client";
import { cn } from "@/lib/cn";

export function DashboardShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="bg-background flex min-h-screen">
      {/* â”€â”€ Desktop sidebar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <aside className="border-border bg-card/50 hidden w-60 shrink-0 flex-col border-r backdrop-blur-sm md:flex">
        <BrandHeader />
        <div className="flex flex-1 flex-col">
          <SidebarNavLinks />
          <SidebarFooter />
        </div>
      </aside>

      {/* â”€â”€ Mobile overlay drawer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
              aria-hidden="true"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 40 }}
              className="border-border bg-card fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r shadow-2xl md:hidden"
            >
              <div className="border-border flex h-14 items-center justify-between border-b px-4">
                <div className="flex items-center gap-2">
                  <div className="flex size-6 items-center justify-center rounded-md bg-gradient-to-br from-primary to-violet-500 shadow-sm shadow-primary/20">
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
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* â”€â”€ Main area â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/70 sticky top-0 z-30 flex h-14 items-center justify-between border-b px-4 backdrop-blur-md">
          <button
            className="text-muted-foreground hover:text-foreground mr-2 rounded-md p-1 transition-colors hover:bg-muted md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={mobileOpen}
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>

          <span className="text-sm font-semibold tracking-tight md:hidden">
            {clientEnv.NEXT_PUBLIC_APP_NAME}
          </span>

          <div className="ml-auto flex items-center gap-1">
            <LogoutButton />
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

function BrandHeader() {
  return (
    <div className="border-border flex h-14 items-center border-b px-4">
      <div className="flex items-center gap-2.5">
        <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-violet-500 shadow-sm shadow-primary/20">
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
    <div className="mt-auto border-t border-border/50 px-4 py-3">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/8 px-2.5 py-1 text-[10px] font-medium text-primary/70">
        <Cpu className="size-2.5 shrink-0" aria-hidden="true" />
        Gemini AI
      </span>
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
] as const;

function SidebarNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5 p-3" aria-label="Main navigation">
      {NAV_ITEMS.map((item) => (
        <SidebarLink
          key={item.href}
          href={item.href}
          icon={item.icon}
          isActive={
            pathname === item.href || pathname.startsWith(`${item.href}/`)
          }
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
        "relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
        isActive
          ? "text-foreground"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      )}
    >
      {/* Animated background pill */}
      {isActive && (
        <motion.span
          layoutId="sidebar-active-bg"
          className="absolute inset-0 rounded-lg bg-accent"
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
        />
      )}

      {/* Left accent bar */}
      {isActive && (
        <motion.span
          layoutId="sidebar-accent-bar"
          className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary"
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
        />
      )}

      <span className={cn("relative z-10 transition-colors", isActive ? "text-primary" : "")}>
        {icon}
      </span>
      <span className="relative z-10">{children}</span>
    </Link>
  );
}

