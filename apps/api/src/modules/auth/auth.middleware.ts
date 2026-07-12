import type { UserRole } from "@contextos-ai/database";
import type { RequestHandler } from "express";

import { ForbiddenError, UnauthorizedError } from "../../lib/http-errors.js";
import { ACCESS_TOKEN_COOKIE } from "./auth.cookies.js";
import { authRepository } from "./auth.repository.js";
import { verifyAccessToken } from "./auth.tokens.js";

/**
 * Verifies the access token cookie, then confirms the user still exists and
 * has not been soft-deleted. Attaches a fresh `req.user` from the DB row.
 *
 * Why we hit the DB on every request (not just verify the JWT signature):
 *   - A soft-deleted user retains a valid JWT until it expires (up to 15 min).
 *     Without the DB check, that user can keep making API calls.
 *   - The role claim in the JWT could be stale if an admin changed the user's
 *     role between token issuance and this request. Reading from DB ensures
 *     the role is always current.
 *
 * The query is a single indexed SELECT and is sub-millisecond on a warm
 * connection pool. Add a Redis user-cache here if this becomes a bottleneck.
 */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const token = req.cookies?.[ACCESS_TOKEN_COOKIE];
    if (typeof token !== "string" || token.length === 0) {
      throw new UnauthorizedError("Authentication required");
    }

    const payload = await verifyAccessToken(token);

    // Confirm the account still exists and is not soft-deleted.
    const user = await authRepository.findUserById(payload.sub);
    if (!user) {
      throw new UnauthorizedError("Account no longer exists");
    }

    // Use DB role — not the JWT claim — so role changes take effect immediately.
    req.user = { id: user.id, role: user.role };
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Like `requireAuth` but DOESN'T throw if no token is present.
 *
 * If a token IS present, it is fully validated (including the DB lookup) —
 * partial trust is more dangerous than no trust.
 * If the user is soft-deleted, req.user is left unset (treated as anonymous).
 */
export const optionalAuth: RequestHandler = async (req, _res, next) => {
  try {
    const token = req.cookies?.[ACCESS_TOKEN_COOKIE];
    if (typeof token !== "string" || token.length === 0) {
      next();
      return;
    }

    const payload = await verifyAccessToken(token);
    const user = await authRepository.findUserById(payload.sub);

    if (user) {
      req.user = { id: user.id, role: user.role };
    }
    // Soft-deleted user: token was valid but account gone → anonymous treatment.

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Allow only specific roles. Must be used AFTER requireAuth.
 *
 *   router.get("/admin/users", requireAuth, requireRole("ADMIN"), handler);
 */
export function requireRole(...allowedRoles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(new UnauthorizedError("Authentication required"));
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      next(new ForbiddenError("Insufficient permissions"));
      return;
    }
    next();
  };
}
