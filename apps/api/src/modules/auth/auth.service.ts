import { hash, verify } from "@node-rs/argon2";
import type { User } from "@contextos-ai/database";
import type { LoginInput, SignupInput } from "@contextos-ai/validators/auth";

import { ConflictError, UnauthorizedError } from "../../lib/http-errors.js";
import { authRepository } from "./auth.repository.js";
import {
  generateRefreshToken,
  hashRefreshToken,
  REFRESH_TOKEN_TTL_MS,
  signAccessToken,
} from "./auth.tokens.js";

/**
 * Argon2 parameters — OWASP 2025 recommendations.
 *
 * - `memoryCost: 65536` (64 MB) — primary defense against GPU/ASIC cracking.
 * - `timeCost: 3` — iterations.
 * - `parallelism: 4` — lanes.
 *
 * `@node-rs/argon2` defaults to Argon2id (the recommended variant). We pin
 * the parameters explicitly so future package updates can't silently weaken
 * our hashes.
 */
const ARGON2_OPTIONS = {
  memoryCost: 65_536,
  timeCost: 3,
  parallelism: 4,
};

/**
 * Result of any "issue tokens" flow (signup, login, refresh).
 * The plaintext refresh token is here so the controller can set the cookie.
 * It is NEVER persisted in plaintext.
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

export interface AuthResult {
  user: User;
  tokens: AuthTokens;
}

/**
 * Issue a new pair of tokens AND persist the refresh-token session.
 *
 * Each call creates a new Session row, so a user with N active devices has
 * N rows. Logout deletes one row; password change deletes all.
 *
 * The plaintext refresh token is returned to the controller; only the
 * SHA-256 hash is stored.
 */
async function issueTokenPair(
  user: User,
  context: { userAgent?: string; ipAddress?: string },
): Promise<AuthTokens> {
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await authRepository.createSession({
    userId: user.id,
    refreshTokenHash,
    expiresAt: refreshTokenExpiresAt,
    userAgent: context.userAgent,
    ipAddress: context.ipAddress,
  });

  const accessToken = await signAccessToken({ sub: user.id, role: user.role });

  return { accessToken, refreshToken, refreshTokenExpiresAt };
}

export const authService = {
  /**
   * Sign up a new user.
   *
   * Failure modes:
   *   - Email already taken → ConflictError(409)
   *
   * On success the user is created AND a session is opened — they're
   * logged in immediately.
   */
  async signup(
    input: SignupInput,
    context: { userAgent?: string; ipAddress?: string },
  ): Promise<AuthResult> {
    const existing = await authRepository.findUserByEmail(input.email);
    if (existing) {
      throw new ConflictError("An account with this email already exists");
    }

    const passwordHash = await hash(input.password, ARGON2_OPTIONS);
    const user = await authRepository.createUser({
      email: input.email,
      passwordHash,
      name: input.name,
    });

    const tokens = await issueTokenPair(user, context);
    return { user, tokens };
  },

  /**
   * Verify credentials and issue tokens.
   *
   * Security: we return the same generic error for both "user not found"
   * and "wrong password". Differentiating leaks which emails are registered
   * (account enumeration).
   *
   * Even when the email doesn't exist we still call `verify` against a
   * dummy hash so timing observations can't distinguish the two cases.
   */
  async login(
    input: LoginInput,
    context: { userAgent?: string; ipAddress?: string },
  ): Promise<AuthResult> {
    const user = await authRepository.findUserByEmail(input.email);

    // Constant-time-ish guard: hash even on miss to avoid revealing existence.
    if (!user || !user.passwordHash) {
      // Burn the same CPU as a real verify call.
      await verify(
        "$argon2id$v=19$m=65536,t=3,p=4$Y29udGV4dG9zLXN0YXJ0ZXI$ZHVtbXktaGFzaC1mb3ItdGltaW5n",
        input.password,
      ).catch(() => false);
      throw new UnauthorizedError("Invalid email or password");
    }

    const valid = await verify(user.passwordHash, input.password);
    if (!valid) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const tokens = await issueTokenPair(user, context);
    return { user, tokens };
  },

  /**
   * Rotate a refresh token. Used by /auth/refresh.
   *
   * Steps:
   *   1. Look up the session by the SHA-256 of the presented refresh token.
   *   2. If not found OR expired → 401 (caller should clear cookies).
   *   3. DELETE the old session, CREATE a new one with a new refresh token.
   *   4. Return new access + refresh pair.
   *
   * Step 3's delete-then-create makes any future presentation of the OLD
   * refresh token automatically invalid (replay defense by design).
   */
  async refresh(
    presentedRefreshToken: string,
    context: { userAgent?: string; ipAddress?: string },
  ): Promise<AuthTokens> {
    const refreshTokenHash = hashRefreshToken(presentedRefreshToken);
    const session = await authRepository.findValidSessionByRefreshHash(refreshTokenHash);
    if (!session) {
      throw new UnauthorizedError("Refresh token is invalid or expired");
    }

    const user = await authRepository.findUserById(session.userId);
    if (!user) {
      // Edge case: user was soft-deleted between session create and now.
      await authRepository.deleteSessionById(session.id);
      throw new UnauthorizedError("Account no longer exists");
    }

    // Rotate: delete-then-create. Tiny race window OK since both ops are
    // idempotent and the worst case is "log in again".
    await authRepository.deleteSessionById(session.id);
    return issueTokenPair(user, context);
  },

  /**
   * Logout: delete the session matching the presented refresh token.
   * Idempotent — unknown tokens are silently ignored (caller still clears cookies).
   */
  async logout(presentedRefreshToken: string | undefined): Promise<void> {
    if (!presentedRefreshToken) return;
    const refreshTokenHash = hashRefreshToken(presentedRefreshToken);
    const session = await authRepository.findValidSessionByRefreshHash(refreshTokenHash);
    if (session) {
      await authRepository.deleteSessionById(session.id);
    }
  },
};
