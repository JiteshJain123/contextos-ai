import { z } from "zod";

import { cuidSchema, slugSchema } from "./primitives";

/**
 * Project-domain schemas.
 *
 * A project is the top-level container for tasks (and later: documents,
 * conversations, etc.). It belongs to a user (owner) and has a URL slug.
 */

const projectNameSchema = z
  .string()
  .min(1, "Project name is required")
  .max(100, "Project name must be at most 100 characters")
  .transform((v) => v.trim());

const projectDescriptionSchema = z
  .string()
  .max(2000, "Description must be at most 2000 characters")
  .optional();

// ============== Create ==============
export const createProjectSchema = z.object({
  name: projectNameSchema,
  slug: slugSchema,
  description: projectDescriptionSchema,
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

// ============== Update ==============
// `.partial()` derives `{ name?, slug?, description? }` automatically — no
// hand-maintained second schema.
export const updateProjectSchema = createProjectSchema.partial();
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

// ============== Project DTO ==============
export const projectDTO = z.object({
  id: cuidSchema,
  name: z.string(),
  slug: slugSchema,
  description: z.string().nullable(),
  ownerId: cuidSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  // Populated by the list endpoint only — absent on single-project fetches
  taskCount: z.number().int().nonnegative().optional(),
  doneTaskCount: z.number().int().nonnegative().optional(),
  overdueTaskCount: z.number().int().nonnegative().optional(),
});
export type ProjectDTO = z.infer<typeof projectDTO>;
