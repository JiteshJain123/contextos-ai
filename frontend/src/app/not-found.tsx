import Link from "next/link";
import { Home, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 overflow-hidden px-4">
      {/* Ambient blobs */}
      <div
        className="pointer-events-none absolute -top-32 left-1/2 size-80 -translate-x-1/2 rounded-full bg-primary/6 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative flex flex-col items-center gap-5 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-muted shadow-sm">
          <SearchX className="size-7 text-muted-foreground/50" aria-hidden="true" />
        </div>
        <div>
          <p className="font-mono text-6xl font-bold text-muted-foreground/15 select-none">404</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">Page not found</h2>
          <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md hover:-translate-y-px active:scale-[0.98]"
        >
          <Home className="size-4" aria-hidden="true" />
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
