"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { useMounted } from "@/lib/client-prefs";

const ORDER = ["light", "dark", "system"] as const;

const META: Record<(typeof ORDER)[number], { icon: React.ElementType; label: string }> = {
  light: { icon: Sun, label: "Light theme" },
  dark: { icon: Moon, label: "Dark theme" },
  system: { icon: Monitor, label: "System theme" },
};

/**
 * Cycles light → dark → system. Rendered in the topbar.
 *
 * The mounted guard avoids a hydration mismatch: the server doesn't know
 * the user's stored theme, so we render a neutral placeholder until mounted.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  const current = ORDER.includes(theme as (typeof ORDER)[number])
    ? (theme as (typeof ORDER)[number])
    : "system";
  const { icon: Icon, label } = META[current];
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length] ?? "system";

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      title={mounted ? `${label} — click for ${next}` : "Toggle theme"}
      aria-label={mounted ? `${label} — switch to ${next}` : "Toggle theme"}
      className="text-muted-foreground hover:text-foreground rounded-md p-1.5 transition-colors hover:bg-muted"
    >
      {mounted ? (
        <Icon className="size-4" aria-hidden="true" />
      ) : (
        <Sun className="size-4 opacity-0" aria-hidden="true" />
      )}
    </button>
  );
}
