import { z } from "zod";

import { validateEnv } from "./validate";

/**
 * Client-side environment schema.
 *
 * SECURITY CRITICAL: every value defined here is inlined into the browser bundle
 * by Next.js. Treat every entry as public. Never put secrets here.
 *
 * Convention: keys MUST start with `NEXT_PUBLIC_`. The factory below enforces
 * this at runtime as defense-in-depth against accidental misconfiguration.
 */
export const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default("contextos-ai"),
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_API_URL: z.url().default("http://localhost:4000"),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1, "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required — get it from clerk.com/dashboard"),
});

/**
 * Typed shape of the client environment, inferred from the schema.
 */
export type ClientEnv = z.infer<typeof clientEnvSchema>;

/**
 * Parse and validate the client environment. Safe to call from both server
 * and client contexts in Next.js — `NEXT_PUBLIC_*` values are inlined at build.
 *
 * Throws on any validation failure with all issues collected.
 *
 * Call this ONCE per app:
 *
 * ```ts
 * import { createClientEnv } from "@/lib/config/client";
 * export const env = createClientEnv();
 * ```
 *
 * @param env - Raw env record. Defaults to `process.env`. Inject a mock in tests.
 */
export function createClientEnv(env: Record<string, string | undefined> = process.env): ClientEnv {
  // Defense-in-depth: ensure no non-NEXT_PUBLIC_ key sneaks into this schema.
  // This is a developer-time check; production builds with a stable schema
  // will pay zero cost beyond the boot-once iteration.
  for (const key of Object.keys(clientEnvSchema.shape)) {
    if (!key.startsWith("NEXT_PUBLIC_")) {
      throw new Error(
        `[@/lib/config] Client schema contains "${key}" without the ` +
          `NEXT_PUBLIC_ prefix. This would leak a secret to the browser. ` +
          `Move it to the server schema or rename it.`,
      );
    }
  }

  return validateEnv(clientEnvSchema, env, "client");
}
