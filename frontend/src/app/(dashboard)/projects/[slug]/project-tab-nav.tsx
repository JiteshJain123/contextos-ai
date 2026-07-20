"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

const TABS = [
  { label: "Board", path: "" },
  { label: "Planner", path: "/plan" },
  { label: "Breakdown", path: "/breakdown" },
  { label: "Execution", path: "/execution" },
  { label: "Insights", path: "/insights" },
  { label: "Memory", path: "/memory" },
  { label: "Documents", path: "/documents" },
  { label: "Calendar", path: "/calendar" },
  { label: "Timeline", path: "/timeline" },
] as const;

export function ProjectTabNav({ slug }: { slug: string }) {
  const pathname = usePathname();
  const base = `/projects/${slug}`;

  return (
    <div className="relative">
      {/* Right-side gradient fade */}
      <div
        className="pointer-events-none absolute right-0 top-0 z-10 h-full w-10 bg-gradient-to-l from-background/95 to-transparent"
        aria-hidden="true"
      />

      <nav
        className="flex gap-0.5 overflow-x-auto scroll-smooth"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        aria-label="Project sections"
      >
        {TABS.map(({ label, path }) => {
          const href = `${base}${path}`;
          const isActive =
            path === ""
              ? pathname === base || pathname === `${base}/board`
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href as never}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground/70 hover:bg-muted/50 hover:text-foreground",
              )}
            >
              {/* Animated background pill */}
              {isActive && (
                <motion.span
                  layoutId="tab-active-bg"
                  className="absolute inset-0 rounded-md bg-primary/8"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              {/* Bottom indicator bar */}
              {isActive && (
                <motion.span
                  layoutId="tab-indicator"
                  className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <span className={cn("relative z-10", isActive && "text-primary")}>{label}</span>
            </Link>
          );
        })}
        {/* Spacer so last tab clears the gradient */}
        <div className="w-8 shrink-0" aria-hidden="true" />
      </nav>
    </div>
  );
}
