"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { useMounted } from "@/lib/client-prefs";
import { cn } from "@/lib/cn";

const THEMES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

/**
 * App preferences — currently theme selection. Rendered above the Clerk
 * account profile on the Settings page.
 */
export function PreferencesSection() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  return (
    <section className="w-full max-w-4xl">
      <h2 className="text-sm font-semibold tracking-tight">Preferences</h2>
      <div className="mt-3 rounded-xl border border-border bg-card p-5">
        <p className="text-sm font-medium">Theme</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          How ContextOS AI looks on this device.
        </p>
        <div
          className="mt-3 grid max-w-md grid-cols-3 gap-2"
          role="radiogroup"
          aria-label="Theme"
        >
          {THEMES.map(({ value, label, icon: Icon }) => {
            const selected = mounted && theme === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setTheme(value)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-xs font-medium transition-colors",
                  selected
                    ? "border-primary bg-muted text-foreground"
                    : "border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <Icon
                  className={cn("size-4", selected && "text-primary")}
                  aria-hidden="true"
                />
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
