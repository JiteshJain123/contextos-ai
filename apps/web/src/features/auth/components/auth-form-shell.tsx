import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Shared visual wrapper for auth pages.
 *
 * Renders title, subtitle, the form, and a footer link to switch between
 * login ↔ signup. Centralizes the layout so login and signup look identical
 * (consistent SaaS pattern).
 */
export function AuthFormShell({
  title,
  description,
  children,
  footerPrompt,
  footerLinkHref,
  footerLinkLabel,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footerPrompt: string;
  footerLinkHref: string;
  footerLinkLabel: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>

      {children}

      <div className="relative flex items-center">
        <div className="flex-1 border-t border-border/60" />
      </div>

      <p className="text-center text-sm text-muted-foreground">
        {footerPrompt}{" "}
        <Link
          href={footerLinkHref as never}
          className="font-semibold text-primary underline-offset-4 transition-colors hover:underline"
        >
          {footerLinkLabel}
        </Link>
      </p>
    </div>
  );
}
