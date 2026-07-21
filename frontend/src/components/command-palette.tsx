"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Bot,
  CircleHelp,
  FolderKanban,
  LayoutDashboard,
  Search,
  Settings,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { useProjects } from "@/features/project/hooks/use-projects";
import { cn } from "@/lib/cn";

interface PaletteItem {
  id: string;
  label: string;
  hint?: string;
  href: string;
  icon: React.ElementType;
}

const PAGES: PaletteItem[] = [
  { id: "nav-dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { id: "nav-projects", label: "Projects", href: "/projects", icon: FolderKanban },
  { id: "nav-ai", label: "AI Assistant", href: "/ai", icon: Bot },
  { id: "nav-settings", label: "Settings", href: "/settings", icon: Settings },
  { id: "nav-help", label: "Help & getting started", href: "/help", icon: CircleHelp },
];

/**
 * Ctrl/Cmd+K command palette — jump to pages and projects.
 *
 * Built on the Dialog primitive already used app-wide (no extra dependency):
 * a filter input plus arrow-key/Enter selection over a flat result list.
 */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const projectsQuery = useProjects({ page: 1, pageSize: 50 });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const items = useMemo<PaletteItem[]>(() => {
    const projects = projectsQuery.data?.data ?? [];
    const projectItems: PaletteItem[] = projects.map((p) => ({
      id: `project-${p.id}`,
      label: p.name,
      hint: "Project",
      href: `/projects/${p.slug}`,
      icon: FolderKanban,
    }));
    const all = [...PAGES, ...projectItems];
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((item) => item.label.toLowerCase().includes(q));
  }, [projectsQuery.data, query]);

  // Derived highlight: clamp instead of syncing state when results shrink.
  const highlightIndex = Math.min(activeIndex, Math.max(items.length - 1, 0));

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setQuery("");
      setActiveIndex(0);
    }
  }

  function select(item: PaletteItem | undefined) {
    if (!item) return;
    handleOpenChange(false);
    router.push(item.href as never);
  }

  function onInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(Math.min(highlightIndex + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(Math.max(highlightIndex - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      select(items[highlightIndex]);
    }
  }

  // Keep the highlighted row visible while arrowing through results.
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${highlightIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-foreground hidden items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-xs transition-colors hover:bg-muted sm:flex"
        aria-label="Open command palette"
      >
        <Search className="size-3.5" aria-hidden="true" />
        <span>Search…</span>
        <kbd className="rounded border border-border bg-muted px-1 font-mono text-[10px]">
          Ctrl K
        </kbd>
      </button>
      {/* Icon-only trigger on small screens */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-foreground rounded-md p-1.5 transition-colors hover:bg-muted sm:hidden"
        aria-label="Open command palette"
      >
        <Search className="size-4" aria-hidden="true" />
      </button>

      <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/20" />
          <DialogPrimitive.Content
            className="fixed left-1/2 top-24 z-50 w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground outline-none"
            aria-describedby={undefined}
          >
            <DialogPrimitive.Title className="sr-only">Command palette</DialogPrimitive.Title>
            <div className="flex items-center gap-2 border-b border-border px-3">
              <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={onInputKeyDown}
                placeholder="Search pages and projects…"
                className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                role="combobox"
                aria-expanded="true"
                aria-controls="command-palette-list"
                aria-activedescendant={items[highlightIndex]?.id}
              />
            </div>
            <div
              ref={listRef}
              id="command-palette-list"
              role="listbox"
              className="max-h-72 overflow-auto p-1.5"
            >
              {items.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No results for “{query}”
                </p>
              ) : (
                items.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      id={item.id}
                      data-index={index}
                      type="button"
                      role="option"
                      aria-selected={index === highlightIndex}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => select(item)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm",
                        index === highlightIndex
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {item.hint && (
                        <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground/60">
                          {item.hint}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
