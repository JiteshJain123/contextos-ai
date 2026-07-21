import { Bot } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/** Shared sticky glass header for public pages (landing, about, help). */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-violet-600 shadow-sm shadow-primary/25 transition-transform group-hover:scale-105">
            <Bot className="size-4.5 text-primary-foreground" aria-hidden="true" />
          </span>
          <span className="text-base font-semibold tracking-tight">
            ContextOS <span className="text-primary">AI</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Site">
          <Button variant="ghost" size="sm" asChild className="hidden text-muted-foreground hover:text-foreground sm:inline-flex">
            <Link href="/about">About</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild className="hidden text-muted-foreground hover:text-foreground sm:inline-flex">
            <Link href="/help">How it works</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button size="sm" asChild className="shadow-sm shadow-primary/25">
            <Link href="/signup">Get started</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
