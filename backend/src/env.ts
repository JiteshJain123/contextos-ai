import { createServerEnv } from "@/config/env/server";

/**
 * Validated environment for the API.
 *
 * Loaded ONCE at boot. If any required variable is missing or malformed,
 * `createServerEnv` throws — the process exits before the HTTP server starts.
 *
 * Env file discovery is handled by Node's `--env-file-if-exists=.env` flag
 * (see package.json `dev` and `start` scripts), so by the time this module
 * runs, `process.env` is already populated.
 */
export const env = createServerEnv(process.env);
