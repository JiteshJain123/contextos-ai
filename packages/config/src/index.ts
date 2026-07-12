/**
 * @contextos-ai/config — public surface
 *
 * Apps SHOULD prefer the subpath imports (`@contextos-ai/config/server` or
 * `@contextos-ai/config/client`) so the bundler can scope-check imports
 * and prevent leaking server schemas into the browser bundle.
 *
 * This root entry is provided for tooling / typegen use cases that need
 * both shapes at once.
 */

export { createServerEnv, serverEnvSchema, type ServerEnv } from "./server";

export { createClientEnv, clientEnvSchema, type ClientEnv } from "./client";
