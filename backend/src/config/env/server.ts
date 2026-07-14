import { z } from "zod";

import { validateEnv } from "./validate";

/**
 * Server-only environment schema.
 *
 * Vars defined here are accessible from any server runtime: the Express API,
 * Next.js Server Components, Route Handlers, server actions, and background jobs.
 *
 * SECURITY: nothing here may be exposed to the browser. Anything client-safe
 * MUST be defined in `./client.ts` under the `NEXT_PUBLIC_*` namespace.
 */
export const serverEnvSchema = z
  .object({
    // ============== Runtime ==============
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

    // ============== HTTP server (backend) ==============
    PORT: z.coerce.number().int().positive().max(65535).default(4000),
    HOST: z.string().min(1).default("0.0.0.0"),

    // ============== Database ==============
    DATABASE_URL: z
      .url("DATABASE_URL must be a valid URL")
      .refine((v) => v.startsWith("postgres://") || v.startsWith("postgresql://"), {
        message: "DATABASE_URL must use the postgres:// or postgresql:// scheme",
      }),

    // ============== Auth (Clerk) ==============
    CLERK_SECRET_KEY: z.string().min(1, "CLERK_SECRET_KEY is required — get it from clerk.com/dashboard"),
    CLERK_WEBHOOK_SECRET: z.string().min(1, "CLERK_WEBHOOK_SECRET is required — create a webhook in clerk.com/dashboard"),

    // ============== CORS ==============
    // Comma-separated allowed origins. Required in production.
    // e.g. CORS_ORIGIN=https://app.example.com,https://admin.example.com
    CORS_ORIGIN: z.string().optional(),

    // ============== Logging ==============
    LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),

    // ============== Cache / Queue (optional) ==============
    REDIS_URL: z
      .url()
      .refine((v) => v.startsWith("redis://") || v.startsWith("rediss://"), {
        message: "REDIS_URL must use the redis:// or rediss:// scheme",
      })
      .optional(),

    // ============== AI Providers (optional — declare what the app uses) ==============
    GEMINI_API_KEY: z.string().min(1).optional(),
    OPENAI_API_KEY: z.string().min(1).optional(),
    ANTHROPIC_API_KEY: z.string().min(1).optional(),

    // ============== Vector Database (optional — e.g. Pinecone) ==============
    PINECONE_API_KEY: z.string().min(1).optional(),
    PINECONE_INDEX: z.string().min(1).optional(),
    PINECONE_ENVIRONMENT: z.string().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === "production" && !data.CORS_ORIGIN) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CORS_ORIGIN"],
        message:
          "CORS_ORIGIN is required in production — set it to your frontend URL (e.g. https://app.example.com)",
      });
    }
  });

/**
 * Typed shape of the server environment, inferred from the schema.
 * Apps should import this type instead of re-declaring it.
 */
export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Parse and validate the server environment. Throws on any validation failure
 * with a single error listing every issue.
 *
 * Call this ONCE at the entry point of each server app:
 *
 * ```ts
 * import { createServerEnv } from "@/config/env/server";
 * import "dotenv/config";
 * export const env = createServerEnv(process.env);
 * ```
 *
 * @param env - Raw env record. Defaults to `process.env`. Inject a mock in tests.
 */
export function createServerEnv(env: Record<string, string | undefined> = process.env): ServerEnv {
  return validateEnv(serverEnvSchema, env, "server");
}
