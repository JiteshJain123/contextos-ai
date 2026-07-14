import type { HelmetOptions } from "helmet";

/**
 * Helmet sets a battery of security-relevant HTTP headers:
 *   - Content-Security-Policy
 *   - Strict-Transport-Security
 *   - X-Content-Type-Options
 *   - X-Frame-Options
 *   - Referrer-Policy
 *   - and others
 *
 * Defaults are sane for an API — most are kept, with explicit notes for
 * future overrides.
 */
export const helmetOptions: HelmetOptions = {
  // We don't serve HTML; the default CSP is fine but we set frameguard explicitly.
  crossOriginResourcePolicy: { policy: "same-site" },
  // Don't advertise the server identity. Express sets `X-Powered-By: Express`
  // unless we disable it (we also do `app.disable("x-powered-by")` for safety).
  hidePoweredBy: true,
};
