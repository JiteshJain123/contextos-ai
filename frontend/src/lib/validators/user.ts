import { z } from "zod";

import { cuidSchema, emailSchema, nameSchema } from "./primitives";

/**
 * User-domain schemas.
 *
 * Note the strict input/output split:
 *   - Inputs (updateProfileSchema) describe what users can SEND.
 *   - DTOs (userDTO, currentUserDTO) describe what the server RETURNS.
 *
 * The DTO never includes `passwordHash`, `deletedAt`, or any other field that
 * shouldn't leave the server. The database row and the DTO are distinct shapes.
 */

// ============== Update profile (input) ==============
// Partial — users update one or more fields at a time.
export const updateProfileSchema = z.object({
  name: nameSchema.optional(),
  email: emailSchema.optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// ============== User preferences ==============
export const userPreferencesSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).default("system"),
  locale: z.string().min(2).max(10).default("en"),
  emailNotifications: z.boolean().default(true),
});
export type UserPreferences = z.infer<typeof userPreferencesSchema>;

// ============== Public user DTO ==============
// Safe to expose to ANY authenticated viewer. Used for: author info on posts,
// member lists, mentions, etc. NEVER includes private fields.
export const userDTO = z.object({
  id: cuidSchema,
  email: emailSchema,
  name: z.string().nullable(),
  emailVerifiedAt: z.date().nullable(),
  createdAt: z.date(),
});
export type UserDTO = z.infer<typeof userDTO>;

// ============== Current user DTO ==============
// Exposed only to the authenticated user themselves (via /me or session).
// Includes private settings the user controls but others shouldn't see.
export const currentUserDTO = userDTO.extend({
  preferences: userPreferencesSchema,
  updatedAt: z.date(),
});
export type CurrentUserDTO = z.infer<typeof currentUserDTO>;
