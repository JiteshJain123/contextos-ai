import { createServerEnv } from "@/lib/config/server";

/**
 * Server-side environment.
 *
 * Use in: Server Components, Route Handlers (app/api), server actions,
 * middleware.ts. NEVER import from a Client Component — Next's bundler
 * will block it, but the import path being wrong is the real signal.
 */
export const env = createServerEnv(process.env);
