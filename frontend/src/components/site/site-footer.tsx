import Link from "next/link";

/** Shared footer for public pages (landing, about, help). */
export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 text-xs text-muted-foreground sm:px-6">
        <span>© {new Date().getFullYear()} ContextOS AI</span>
        <nav className="flex items-center gap-4" aria-label="Footer">
          <Link href="/about" className="transition-colors hover:text-foreground">
            About
          </Link>
          <Link href="/help" className="transition-colors hover:text-foreground">
            How it works
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-foreground"
          >
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
