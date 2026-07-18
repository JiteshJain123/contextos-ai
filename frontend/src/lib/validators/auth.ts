import { z } from "zod";

import { cuidSchema, emailSchema, nameSchema, passwordSchema } from "./primitives";

/**
 * Authentication-domain schemas.
 *
 * Conventions:
 * - Input schemas: <verb>Schema (e.g. loginSchema)
 * - Output DTOs:   <subject>DTO (e.g. sessionDTO)
 * - Inferred types: <Verb><Subject>Input / <Subject>DTO
 *
 * These schemas are the ONE source of truth — used identically by Next.js
 * forms (via react-hook-form's zodResolver) and Express route handlers (via
 * parseInput from "../parse").
 */

// ============== Login ==============
export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
export type LoginInput = z.infer<typeof loginSchema>;

// ============== Signup ==============
export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema.optional(),
});
export type SignupInput = z.infer<typeof signupSchema>;

// ============== Request password reset ==============
// (Sent when user clicks "forgot password" — server emails a reset link.)
export const requestPasswordResetSchema = z.object({
  email: emailSchema,
});
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;

// ============== Reset password (via emailed token) ==============
export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    newPassword: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ============== Change password (authenticated) ==============
export const changePasswordSchema = z
  .object({
    currentPassword: passwordSchema,
    newPassword: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// ============== Session DTO ==============
// Returned to the client after successful login. Mirrors the database Session
// model but exposes only client-safe fields.
export const sessionDTO = z.object({
  id: cuidSchema,
  userId: cuidSchema,
  expiresAt: z.date(),
});
export type SessionDTO = z.infer<typeof sessionDTO>;
