import type { CookieOptions } from "express";

import { env } from "../../env.js";

/**
 * Cookie names.
 *
 * Prefixing with `__Host-` would give extra security (forces secure + path=/,
 * no domain), but breaks subdomain sharing. Use plain names for now; revisit
 * when we know production deployment topology.
 */
export const ACCESS_TOKEN_COOKIE = "ctx_access";
export const REFRESH_TOKEN_COOKIE = "ctx_refresh";

const isProduction = env.NODE_ENV === "production";

/**
 * Base options shared by both auth cookies.
 *
 * - httpOnly:    JS in the browser CANNOT read the cookie → XSS-stealing prevented.
 * - secure:      HTTPS only in production. False in dev (no local HTTPS).
 * - sameSite:    "lax" — sent on top-level navigation, blocked on cross-site POSTs.
 *                Provides baseline CSRF protection without breaking OAuth-style flows.
 * - path:        "/" — cookies accessible to every endpoint.
 * - domain:      from env (optional). Set for subdomain sharing in production.
 */
const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  path: "/",
  ...(env.COOKIE_DOMAIN !== undefined && { domain: env.COOKIE_DOMAIN }),
};

/**
 * Options for the short-lived access-token cookie.
 *
 * `maxAge` is set per call (computed from the access-token expiry) because
 * the source of truth is the JWT expiry; we mirror it on the cookie so the
 * browser drops the cookie at the same time the JWT expires.
 */
export function accessCookieOptions(maxAgeMs: number): CookieOptions {
  return { ...baseCookieOptions, maxAge: maxAgeMs };
}

/**
 * Options for the long-lived refresh-token cookie.
 *
 * Scoped to `/api/v1/auth` so it's sent ONLY on auth endpoints. This means
 * even if an XSS leak existed elsewhere, the refresh token wouldn't be sent
 * with that exfiltrating request.
 */
export function refreshCookieOptions(maxAgeMs: number): CookieOptions {
  return { ...baseCookieOptions, path: "/api/v1/auth", maxAge: maxAgeMs };
}

/**
 * Options used when CLEARING a cookie. Must match the original cookie's
 * scope (path, domain, sameSite, secure) — browsers ignore Set-Cookie with
 * a delete intent if these don't match.
 */
export function clearAccessCookieOptions(): CookieOptions {
  return { ...baseCookieOptions, maxAge: 0 };
}

export function clearRefreshCookieOptions(): CookieOptions {
  return { ...baseCookieOptions, path: "/api/v1/auth", maxAge: 0 };
}
