import { Bot } from "lucide-react";
import Link from "next/link";

/** Shared footer for public pages (landing, about, help). */
export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-md bg-gradient-to-br from-primary to-violet-600">
              <Bot className="size-4 text-primary-foreground" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold tracking-tight">ContextOS AI</p>
              <p className="text-xs text-muted-foreground">The AI workspace for your projects</p>
            </div>
          </div>

          <nav className="flex items-center gap-6 text-sm text-muted-foreground" aria-label="Footer">
            <Link href="/about" className="transition-colors hover:text-foreground">
              About
            </Link>
            <Link href="/help" className="transition-colors hover:text-foreground">
              How it works
            </Link>
            <a
              href="https://github.com/JiteshJain123/contextos-ai"
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-foreground"
            >
              GitHub
            </a>
          </nav>
        </div>

        <div className="mt-8 border-t border-border/60 pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} ContextOS AI · Built with Next.js, Express &amp; Google Gemini
        </div>
      </div>
    </footer>
  );
}
