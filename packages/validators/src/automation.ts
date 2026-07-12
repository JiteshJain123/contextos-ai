import { z } from "zod";

import { cuidSchema } from "./primitives";
import { insightSeverityEnum, insightTypeEnum } from "./insight";

// ============== Detection result ==============

export const detectionResultSchema = z.object({
  type: insightTypeEnum,
  severity: insightSeverityEnum,
  triggerReason: z.string(),
  confidence: z.number().min(0).max(1),
  shouldGenerate: z.boolean(),
});
export type DetectionResult = z.infer<typeof detectionResultSchema>;

// ============== Automation run DTO ==============

export const automationRunDTO = z.object({
  id: cuidSchema,
  projectId: cuidSchema,
  insightType: insightTypeEnum,
  triggerReason: z.string(),
  severity: insightSeverityEnum,
  triggeredAt: z.coerce.date(),
});
export type AutomationRunDTO = z.infer<typeof automationRunDTO>;

// ============== Detect response ==============

export const detectResponseSchema = z.object({
  detections: z.array(detectionResultSchema),
  projectId: cuidSchema,
  detectedAt: z.string(),
});
export type DetectResponse = z.infer<typeof detectResponseSchema>;
