import { rateLimit, type Options } from "express-rate-limit";

/**
 * Base options shared by all rate limiters.
 *
 * In production, swap the default in-memory store for a Redis-backed store
 * (`@express-rate-limit/redis-store`) so the limit is enforced across
 * multiple API instances.
 */
const baseOptions: Partial<Options> = {
  standardHeaders: "draft-7",
  legacyHeaders: false,
};

/**
 * Global rate limit: 100 req / 15 min per IP.
 * Applied to every route in app.ts.
 */
export const globalRateLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: 100,
  message: {
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests — please try again later.",
    },
  },
});

/**
 * Auth rate limit: 10 req / 15 min per IP.
 * Applied only to /auth/login and /auth/signup to resist brute-force attacks.
 *
 * Rationale: the global limiter allows ~6 attempts/minute against a single
 * account. Reducing to 10 total per 15-minute window makes credential stuffing
 * economically impractical without introducing user-facing CAPTCHA.
 */
export const authRateLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: {
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many attempts — please try again in 15 minutes.",
    },
  },
});

/**
 * AI rate limit: 50 req / hour per IP.
 * Applied to the SSE streaming endpoint to cap Gemini API costs and prevent
 * abuse. Each stream is a full Gemini call; 50/hr is generous for normal use.
 *
 * Upgrade path: replace the in-memory store with a Redis store
 * (`@express-rate-limit/redis-store`) so limits are enforced across all
 * API replicas rather than per-process.
 */
export const aiRateLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 60 * 1000,
  limit: 50,
  message: {
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "AI request limit reached — please try again in an hour.",
    },
  },
});
