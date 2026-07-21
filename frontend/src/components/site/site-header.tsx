import { Bot } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/** Shared header for public pages (landing, about, help). */
export function SiteHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary">
            <Bot className="size-4.5 text-primary-foreground" aria-hidden="true" />
          </span>
          <span className="text-base font-semibold tracking-tight">ContextOS AI</span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Site">
          <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
            <Link href="/about">About</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
            <Link href="/help">How it works</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/signup">Get started</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
