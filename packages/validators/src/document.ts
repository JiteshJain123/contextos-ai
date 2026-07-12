import { z } from "zod";

import { cuidSchema } from "./primitives";

// ============================================================
// Enums
// ============================================================

export const documentStatusEnum = z.enum(["PENDING", "PROCESSING", "READY", "FAILED"]);
export type DocumentStatus = z.infer<typeof documentStatusEnum>;

export const SUPPORTED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
] as const;

export type SupportedMimeType = (typeof SUPPORTED_MIME_TYPES)[number];

// ============================================================
// AI analysis sub-types
// ============================================================

export const documentRequirementSchema = z.object({
  text: z.string(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
});
export type DocumentRequirement = z.infer<typeof documentRequirementSchema>;

export const documentDeadlineSchema = z.object({
  description: z.string(),
  date: z.string().nullable(),          // ISO date string or null if ambiguous
  isEstimated: z.boolean().default(false),
});
export type DocumentDeadline = z.infer<typeof documentDeadlineSchema>;

export const documentRiskSchema = z.object({
  description: z.string(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  mitigation: z.string().optional(),
});
export type DocumentRisk = z.infer<typeof documentRiskSchema>;

export const documentSuggestedTaskSchema = z.object({
  title: z.string().max(200),
  description: z.string().max(1000).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  dueDate: z.string().nullable().optional(),  // ISO date string
});
export type DocumentSuggestedTask = z.infer<typeof documentSuggestedTaskSchema>;

// ============================================================
// Document DTO
// ============================================================

export const documentDTO = z.object({
  id: cuidSchema,
  projectId: cuidSchema,
  uploadedById: cuidSchema,
  filename: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  size: z.number().int(),
  status: documentStatusEnum,

  summary: z.string().nullable(),
  requirements: z.array(documentRequirementSchema).nullable(),
  deadlines: z.array(documentDeadlineSchema).nullable(),
  risks: z.array(documentRiskSchema).nullable(),
  suggestedTasks: z.array(documentSuggestedTaskSchema).nullable(),

  processedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type DocumentDTO = z.infer<typeof documentDTO>;

// ============================================================
// SSE stream events (analysis streaming)
// ============================================================

export const documentStreamChunkEvent = z.object({
  type: z.literal("chunk"),
  content: z.string(),
});
export const documentStreamDoneEvent = z.object({
  type: z.literal("done"),
  documentId: cuidSchema,
});
export const documentStreamErrorEvent = z.object({
  type: z.literal("error"),
  message: z.string(),
});
export const documentStreamProgressEvent = z.object({
  type: z.literal("progress"),
  stage: z.enum(["extracting", "analyzing", "saving"]),
  message: z.string(),
});

export const documentStreamEvent = z.discriminatedUnion("type", [
  documentStreamChunkEvent,
  documentStreamDoneEvent,
  documentStreamErrorEvent,
  documentStreamProgressEvent,
]);
export type DocumentStreamEvent = z.infer<typeof documentStreamEvent>;

// ============================================================
// Import tasks input
// ============================================================

export const importTasksFromDocumentSchema = z.object({
  taskIndices: z
    .array(z.number().int().nonnegative())
    .min(1, "Select at least one task")
    .max(50, "Cannot import more than 50 tasks at once"),
});
export type ImportTasksFromDocumentInput = z.infer<typeof importTasksFromDocumentSchema>;

// ============================================================
// AI Plan Generation types
// ============================================================

export const documentPlanTaskSchema = z.object({
  title: z.string().max(200),
  description: z.string().max(1000).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  dueDate: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  estimatedEffort: z.string().max(50).optional(),
  category: z.string().max(50).optional(),
});
export type DocumentPlanTask = z.infer<typeof documentPlanTaskSchema>;

export const documentPlanMilestoneSchema = z.object({
  title: z.string().max(200),
  description: z.string().max(500).optional(),
  targetDate: z.string(),
  taskIndices: z.array(z.number().int().nonnegative()),
});
export type DocumentPlanMilestone = z.infer<typeof documentPlanMilestoneSchema>;

export const documentPlanPhaseSchema = z.object({
  name: z.string().max(100),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  taskIndices: z.array(z.number().int().nonnegative()),
});
export type DocumentPlanPhase = z.infer<typeof documentPlanPhaseSchema>;

export const documentPlanSchema = z.object({
  summary: z.string().max(1500),
  totalEstimatedDays: z.number().int().nonnegative().optional(),
  tasks: z.array(documentPlanTaskSchema),
  milestones: z.array(documentPlanMilestoneSchema),
  phases: z.array(documentPlanPhaseSchema),
});
export type DocumentPlan = z.infer<typeof documentPlanSchema>;

// ── Plan SSE stream events ────────────────────────────────────────────────────

export const documentPlanStreamProgressEvent = z.object({
  type: z.literal("plan_progress"),
  message: z.string(),
});

export const documentPlanStreamDoneEvent = z.object({
  type: z.literal("plan_done"),
  plan: documentPlanSchema,
});

export const documentPlanStreamErrorEvent = z.object({
  type: z.literal("plan_error"),
  message: z.string(),
});

export const documentPlanStreamChunkEvent = z.object({
  type: z.literal("plan_chunk"),
  content: z.string(),
});

export const documentPlanStreamEvent = z.discriminatedUnion("type", [
  documentPlanStreamProgressEvent,
  documentPlanStreamChunkEvent,
  documentPlanStreamDoneEvent,
  documentPlanStreamErrorEvent,
]);
export type DocumentPlanStreamEvent = z.infer<typeof documentPlanStreamEvent>;
