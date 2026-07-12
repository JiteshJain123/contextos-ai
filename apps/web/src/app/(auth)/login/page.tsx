import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthFormShell, LoginForm } from "@/features/auth";

export const metadata: Metadata = { title: "Sign in" };

function LoginFormSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <div className="h-3.5 w-10 animate-pulse rounded bg-muted" />
        <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="h-3.5 w-16 animate-pulse rounded bg-muted" />
        <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
      </div>
      <div className="mt-2 h-10 w-full animate-pulse rounded-md bg-primary/20" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthFormShell
      title="Welcome back"
      description="Sign in to continue to your workspace."
      footerPrompt="Don't have an account?"
      footerLinkHref="/signup"
      footerLinkLabel="Create one"
    >
      <Suspense fallback={<LoginFormSkeleton />}>
        <LoginForm />
      </Suspense>
    </AuthFormShell>
  );
}
