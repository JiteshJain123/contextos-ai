import { loginSchema, signupSchema } from "@contextos-ai/validators/auth";
import { parseInput } from "@contextos-ai/validators/parse";
import type { Request, RequestHandler } from "express";

import { UnauthorizedError } from "../../lib/http-errors.js";
import { created, ok } from "../../lib/response.js";
import {
  accessCookieOptions,
  ACCESS_TOKEN_COOKIE,
  clearAccessCookieOptions,
  clearRefreshCookieOptions,
  refreshCookieOptions,
  REFRESH_TOKEN_COOKIE,
} from "./auth.cookies.js";
import { authService, type AuthTokens } from "./auth.service.js";
import { ACCESS_TOKEN_TTL_MS } from "./auth.tokens.js";

/**
 * Helpers
 */

function buildAuthContext(req: Request): { userAgent?: string; ipAddress?: string } {
  return {
    userAgent: req.get("user-agent") ?? undefined,
    ipAddress: req.ip ?? undefined,
  };
}

function setAuthCookies(res: Parameters<RequestHandler>[1], tokens: AuthTokens): void {
  // Access cookie max-age = JWT TTL; browser drops cookie when JWT expires.
  res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, accessCookieOptions(ACCESS_TOKEN_TTL_MS));
  // Refresh cookie max-age = until refresh-token DB expiry.
  res.cookie(
    REFRESH_TOKEN_COOKIE,
    tokens.refreshToken,
    refreshCookieOptions(tokens.refreshTokenExpiresAt.getTime() - Date.now()),
  );
}

function clearAuthCookies(res: Parameters<RequestHandler>[1]): void {
  res.clearCookie(ACCESS_TOKEN_COOKIE, clearAccessCookieOptions());
  res.clearCookie(REFRESH_TOKEN_COOKIE, clearRefreshCookieOptions());
}

/**
 * Shape returned in the response body for authenticated flows.
 * Tokens are NEVER in the body — they live in HttpOnly cookies.
 */
function publicUser(user: { id: string; email: string; name: string | null; role: string }) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

/**
 * POST /auth/signup
 */
export const signupController: RequestHandler = async (req, res) => {
  const input = parseInput(signupSchema, req.body);
  const { user, tokens } = await authService.signup(input, buildAuthContext(req));
  setAuthCookies(res, tokens);
  res.status(201).json(created({ user: publicUser(user) }));
};

/**
 * POST /auth/login
 */
export const loginController: RequestHandler = async (req, res) => {
  const input = parseInput(loginSchema, req.body);
  const { user, tokens } = await authService.login(input, buildAuthContext(req));
  setAuthCookies(res, tokens);
  res.json(ok({ user: publicUser(user) }));
};

/**
 * POST /auth/refresh
 *
 * Reads the refresh token from the cookie (NOT request body) and rotates it.
 * Returning a generic envelope keeps refresh response shape stable across
 * future changes.
 */
export const refreshController: RequestHandler = async (req, res) => {
  const presented = req.cookies?.[REFRESH_TOKEN_COOKIE];
  if (typeof presented !== "string" || presented.length === 0) {
    clearAuthCookies(res);
    throw new UnauthorizedError("Refresh token missing");
  }
  try {
    const tokens = await authService.refresh(presented, buildAuthContext(req));
    setAuthCookies(res, tokens);
    res.json(ok({ ok: true }));
  } catch (err) {
    // On refresh failure, ALWAYS clear cookies — keeping a broken pair
    // wastes future requests.
    clearAuthCookies(res);
    throw err;
  }
};

/**
 * POST /auth/logout
 *
 * Idempotent — clears cookies and best-effort deletes the session.
 * No 401 on missing token; logout-when-already-logged-out is fine.
 */
export const logoutController: RequestHandler = async (req, res) => {
  const presented = req.cookies?.[REFRESH_TOKEN_COOKIE];
  await authService.logout(typeof presented === "string" ? presented : undefined);
  clearAuthCookies(res);
  res.json(ok({ ok: true }));
};

/**
 * GET /auth/me
 *
 * Returns the authenticated user. The middleware has already populated
 * req.user — we trust it and don't re-fetch unless we need fresh fields.
 */
export const meController: RequestHandler = async (req, res) => {
  // `requireAuth` middleware ensures req.user is populated.
  if (!req.user) {
    throw new UnauthorizedError();
  }
  res.json(ok({ user: { id: req.user.id, role: req.user.role } }));
};
