"use client";

import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";

import { ClerkTokenSync } from "./clerk-token-sync";
import { QueryProvider } from "./query-provider";
import { ThemeProvider } from "./theme-provider";

/**
 * Clerk appearance — makes the hosted auth components (SignIn/SignUp/UserProfile)
 * match the app's indigo brand instead of Clerk's default purple.
 */
const clerkAppearance = {
  variables: {
    colorPrimary: "#4f46e5",
    colorText: "#18181b",
    borderRadius: "0.625rem",
    fontSize: "0.875rem",
  },
  elements: {
    card: "shadow-lg border border-zinc-200",
    headerTitle: "tracking-tight",
    formButtonPrimary: "shadow-sm",
  },
};

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider
      signInUrl="/login"
      signUpUrl="/signup"
      afterSignOutUrl="/login"
      appearance={clerkAppearance}
    >
      <ThemeProvider>
        <QueryProvider>
          <ClerkTokenSync />
          {children}
          <Toaster richColors closeButton />
        </QueryProvider>
      </ThemeProvider>
    </ClerkProvider>
  );
}
