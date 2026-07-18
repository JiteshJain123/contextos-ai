import { createClientEnv } from "@/lib/config/client";

/**
 * Client-side environment (browser-safe).
 *
 * Only NEXT_PUBLIC_* values are validated here. Safe to import from
 * any component — Server, Client, or shared.
 *
 * Next.js inlines NEXT_PUBLIC_* values at build time. Validation runs
 * at module load — if a required var is missing, the bundle build fails.
 */
export const clientEnv = createClientEnv({
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
});
