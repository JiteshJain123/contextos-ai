import { createHash, randomBytes } from "node:crypto";

import { jwtVerify, SignJWT } from "jose";

import { env } from "../../env.js";
import { UnauthorizedError } from "../../lib/http-errors.js";
import type { AccessTokenPayload } from "./auth.types.js";

const ISSUER = "contextos-ai";
const AUDIENCE = "contextos-ai-api";

/**
 * Pre-encode the JWT secret once (it's used on every sign/verify call).
 * `jose` expects Uint8Array for HMAC-style algorithms.
 */
const jwtSecret = new TextEncoder().encode(env.JWT_SECRET);

/**
 * Parse durations like "15m", "30d", "1h" into milliseconds.
 *
 * Kept tiny on purpose — avoids pulling in the heavy `ms` package, and
 * means the supported formats are visible and unsurprising.
 */
function parseDuration(spec: string): number {
  const match = /^(\d+)\s*(s|m|h|d)$/.exec(spec.trim());
  if (!match) {
    throw new Error(`Invalid duration: "${spec}". Use formats like "15m", "30d", "1h".`);
  }
  // Regex anchors guarantee both groups exist if the match succeeded.
  const value = Number(match[1]!);
  const unit = match[2]!;
  const multipliers: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return value * multipliers[unit]!;
}

export const ACCESS_TOKEN_TTL_MS = parseDuration(env.ACCESS_TOKEN_EXPIRES_IN);
export const REFRESH_TOKEN_TTL_MS = parseDuration(env.REFRESH_TOKEN_EXPIRES_IN);

// ============================================================
// Access tokens (JWT, HS256, short-lived, stateless verification)
// ============================================================

/**
 * Sign a new access token. Embeds `sub` (user id) and `role` claims.
 *
 * HS256 (HMAC-SHA256) is used because we have a single auth issuer (this
 * service). RS256/EdDSA would matter only if other services verified
 * tokens without sharing the secret.
 */
export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  return await new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${Math.floor(ACCESS_TOKEN_TTL_MS / 1000)}s`)
    .sign(jwtSecret);
}

/**
 * Verify an access token. Throws `UnauthorizedError` on any failure
 * (expired, bad signature, wrong issuer/audience).
 */
export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  try {
    const { payload } = await jwtVerify(token, jwtSecret, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    const sub = payload.sub;
    const role = payload.role;
    if (typeof sub !== "string" || (role !== "USER" && role !== "ADMIN")) {
      throw new UnauthorizedError("Malformed access token");
    }
    return { sub, role };
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    throw new UnauthorizedError("Invalid or expired access token");
  }
}

// ============================================================
// Refresh tokens (opaque, long-lived, DB-backed, rotated on use)
// ============================================================

/**
 * Generate a cryptographically-random refresh token (256 bits).
 *
 * Returned as base64url (URL/cookie-safe). The plaintext is sent in the
 * cookie; the SHA-256 hash is what we store in the Session table.
 */
export function generateRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Hash a refresh token for DB storage.
 *
 * SHA-256 is fine here (NOT for passwords) — refresh tokens are already
 * high-entropy random bytes, so we don't need slow hashing. The hash exists
 * to make DB dumps useless without the plaintext.
 */
export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
