import type { CorsOptions } from "cors";

import { env } from "../env.js";

/**
 * CORS configuration.
 *
 * `CORS_ORIGIN` in env can be:
 *   - Unset / empty → reflect request origin (dev only; logs a warning at boot).
 *   - Single origin: "https://app.example.com"
 *   - Comma-separated list: "https://app.example.com,https://admin.example.com"
 *
 * `credentials: true` is required for cookie-based sessions; clients must also
 * send `credentials: "include"` in fetch requests.
 */
function parseAllowedOrigins(raw: string | undefined): string[] | null {
  if (!raw || raw.trim() === "") return null;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

const allowed = parseAllowedOrigins(env.CORS_ORIGIN);

export const corsOptions: CorsOptions = {
  origin:
    allowed === null
      ? true // reflect request origin — dev-only fallback
      : (origin, callback) => {
          // Same-origin requests don't send Origin header.
          if (!origin) return callback(null, true);
          if (allowed.includes(origin)) return callback(null, true);
          return callback(new Error(`CORS: origin ${origin} is not allowed`));
        },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
  exposedHeaders: ["X-Request-Id"],
  maxAge: 86400, // cache preflight responses for 24h
};
