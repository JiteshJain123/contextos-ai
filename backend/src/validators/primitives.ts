import { z } from "zod";

/**
 * Building-block schemas reused across every domain.
 *
 * Define once here; never inline `z.email()` in domain files. Centralizing
 * primitives means policy changes (e.g. tightening password length) happen
 * in exactly one place.
 */

// ============== Email ==============
// Normalized to lowercase + trimmed. Most stores expect canonicalized email
// for uniqueness checks; doing it at the validator level prevents drift.
export const emailSchema = z
  .email("Must be a valid email address")
  .min(1)
  .max(255)
  .transform((v) => v.trim().toLowerCase());

// ============== Password ==============
// Length-only rule. NIST 800-63B explicitly recommends against complexity
// requirements (special chars, mixed case) — they encourage reuse and don't
// improve real-world security. Long is better than complex.
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters");

// ============== CUID ==============
// Matches Prisma's default `cuid()` generator. Use this anywhere a row id is
// expected (path params, request bodies, foreign keys).
export const cuidSchema = z.cuid();

// ============== Slug ==============
// URL-safe identifier: lowercase ASCII + digits + hyphens. Used for projects,
// public profile pages, etc. Anchored regex enforces no leading/trailing/double hyphens.
export const slugSchema = z
  .string()
  .min(2)
  .max(64)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug must be lowercase letters/numbers separated by hyphens",
  );

// ============== Human name ==============
// Length-bounded, trimmed. No character restrictions (Unicode-friendly —
// names like "François", "山田", "O'Brien" all valid).
export const nameSchema = z
  .string()
  .min(1, "Name cannot be empty")
  .max(100, "Name must be at most 100 characters")
  .transform((v) => v.trim());

// ============== HTTP(S) URL ==============
// Stricter than z.url() — rejects ftp://, file://, javascript:, etc.
export const httpUrlSchema = z
  .url("Must be a valid URL")
  .refine((v) => v.startsWith("http://") || v.startsWith("https://"), {
    message: "URL must use the http:// or https:// scheme",
  });
