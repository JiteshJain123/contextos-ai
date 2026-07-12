import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge proxy — runs on every request at the edge (Next.js 16 "proxy" convention,
 * replaces the deprecated "middleware" file).
 *
 * Strategy: fast cookie-presence checks only. This is NOT a security
 * boundary — the access token isn't verified here (no Node crypto access in
 * the edge runtime, and we want auth checks to be cheap). True verification
 * happens in (dashboard)/layout.tsx via /auth/me.
 *
 * What this proxy does:
 *   - On /dashboard*: if no access cookie → redirect to /login
 *   - On /login, /signup: if access cookie present → redirect to /dashboard
 *     (unless auth_error=1 signals the session is broken — avoids redirect loops)
 *
 * This prevents flash-of-content for visitors in the wrong auth state.
 * The layout still re-checks for true correctness.
 */

const ACCESS_TOKEN_COOKIE = "ctx_access";
const PROTECTED_PREFIXES = ["/dashboard", "/projects", "/ai"];
const AUTH_PAGES = ["/login", "/signup"];

export function proxy(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;
  const hasAccessCookie = req.cookies.has(ACCESS_TOKEN_COOKIE);

  // Authenticated user shouldn't see auth pages.
  // Exception: if the dashboard layout explicitly signalled an auth failure
  // (auth_error=1) we skip the redirect to avoid an infinite loop when
  // a cookie is present but the backend can no longer validate it.
  const hasAuthError = req.nextUrl.searchParams.has("auth_error");
  if (hasAccessCookie && !hasAuthError && AUTH_PAGES.some((p) => pathname === p)) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Anonymous user shouldn't see protected pages
  if (!hasAccessCookie && PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Pass the current pathname as a request header so server components can build redirect URLs
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

/**
 * Limit the matcher so middleware doesn't run on static assets or API routes.
 *
 * Note: this matcher is a STATIC pattern parsed at build time — variables
 * from `PROTECTED_PREFIXES` would NOT work here. Keep paths inline.
 */
export const config = {
  // `:path*` matches sub-routes; the bare route entry is required separately
  // because `:path*` doesn't match the root of the segment.
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/projects",
    "/projects/:path*",
    "/ai",
    "/ai/:path*",
    "/login",
    "/signup",
  ],
};
