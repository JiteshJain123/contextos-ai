import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthFormShell, SignupForm } from "@/features/auth";

export const metadata: Metadata = { title: "Create account" };

function SignupFormSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <div className="h-3.5 w-28 animate-pulse rounded bg-muted" />
        <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
      </div>
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

export default function SignupPage() {
  return (
    <AuthFormShell
      title="Create your account"
      description="Get started in under a minute."
      footerPrompt="Already have an account?"
      footerLinkHref="/login"
      footerLinkLabel="Sign in"
    >
      <Suspense fallback={<SignupFormSkeleton />}>
        <SignupForm />
      </Suspense>
    </AuthFormShell>
  );
}
