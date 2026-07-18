import { z } from "zod";

import { cuidSchema } from "./primitives";

// ============== Health breakdown ==============

export const healthBreakdownSchema = z.object({
  taskCompletion: z.number().min(0).max(100),
  overdueImpact: z.number().min(0).max(100),
  activityLevel: z.number().min(0).max(100),
  blockerCount: z.number().min(0).max(100),
});
export type HealthBreakdown = z.infer<typeof healthBreakdownSchema>;

// ============== Project health DTO ==============

export const projectHealthDTO = z.object({
  id: cuidSchema,
  projectId: cuidSchema,
  score: z.number().min(0).max(100),
  breakdown: healthBreakdownSchema,
  updatedAt: z.coerce.date(),
});
export type ProjectHealthDTO = z.infer<typeof projectHealthDTO>;
