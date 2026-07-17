/**
 * document/index.ts
 *
 * Module entry point.
 *
 * Exports:
 *  - documentNestedRouter   — mount at /projects/:projectId/documents
 *  - documentServiceInstance — singleton service (for cross-module use)
 *  - shapedDocument         — DTO shaping helper
 */

import type { ProjectDocument } from "@/database";

import { aiProviderInstance } from "../ai/index.js";
import { createDocumentService } from "./document.service.js";

export { documentNestedRouter } from "./document.routes.js";

// ── Resolve Gemini API key (same pattern as ai module) ────────────────────────

const geminiApiKey = process.env.GEMINI_API_KEY ?? "";

export const documentServiceInstance = createDocumentService(aiProviderInstance, geminiApiKey);

// ── DTO shaping ───────────────────────────────────────────────────────────────

/**
 * Shape a raw Prisma ProjectDocument row into the DocumentDTO
 * the frontend expects (snake-case JSON fields, typed JSON columns).
 */
export function shapedDocument(doc: ProjectDocument) {
  return {
    id: doc.id,
    projectId: doc.projectId,
    uploadedById: doc.uploadedById,
    filename: doc.filename,
    originalName: doc.originalName,
    mimeType: doc.mimeType,
    size: doc.size,
    status: doc.status,
    summary: doc.summary ?? null,
    requirements: (doc.requirementsJson ?? null) as unknown,
    deadlines: (doc.deadlinesJson ?? null) as unknown,
    risks: (doc.risksJson ?? null) as unknown,
    suggestedTasks: (doc.suggestedTasksJson ?? null) as unknown,
    processedAt: doc.processedAt ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
