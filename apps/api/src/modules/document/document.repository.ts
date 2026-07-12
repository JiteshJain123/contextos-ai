/**
 * document.repository.ts
 *
 * Data-access layer for ProjectDocument.
 * Every query that reads documents must JOIN through Project → ownerId to
 * enforce user ownership — matching the pattern used in all other repositories.
 */

import { prisma, type DocumentStatus, type ProjectDocument } from "@contextos-ai/database";

import type {
  DocumentRequirement,
  DocumentDeadline,
  DocumentRisk,
  DocumentSuggestedTask,
} from "@contextos-ai/validators/document";

// ── Type helpers ─────────────────────────────────────────────────────────────

type CreateDocumentInput = {
  projectId: string;
  uploadedById: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
};

type UpdateAnalysisInput = {
  extractedText?: string;
  status?: DocumentStatus;
  summary?: string;
  requirements?: DocumentRequirement[];
  deadlines?: DocumentDeadline[];
  risks?: DocumentRisk[];
  suggestedTasks?: DocumentSuggestedTask[];
  processedAt?: Date;
};

// ── Repository ────────────────────────────────────────────────────────────────

export const documentRepository = {
  /** List all non-deleted documents for a project (ownership via ownerId join). */
  async listForProject(
    projectId: string,
    userId: string,
  ): Promise<ProjectDocument[]> {
    const project = await prisma.project.findFirst({
      where: { id: projectId, ownerId: userId, deletedAt: null },
      select: { id: true },
    });
    if (!project) return [];

    return prisma.projectDocument.findMany({
      where: { projectId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
  },

  /** Find a single document — validates ownership through the project. */
  async findOne(
    id: string,
    userId: string,
  ): Promise<ProjectDocument | null> {
    return prisma.projectDocument.findFirst({
      where: {
        id,
        deletedAt: null,
        project: { ownerId: userId, deletedAt: null },
      },
    });
  },

  /** Create a PENDING document record after the file has been stored on disk. */
  async create(data: CreateDocumentInput): Promise<ProjectDocument> {
    return prisma.projectDocument.create({
      data: {
        projectId: data.projectId,
        uploadedById: data.uploadedById,
        filename: data.filename,
        originalName: data.originalName,
        mimeType: data.mimeType,
        size: data.size,
        status: "PENDING",
      },
    });
  },

  /** Update status (e.g. PENDING → PROCESSING → READY | FAILED). */
  async updateStatus(
    id: string,
    status: DocumentStatus,
  ): Promise<ProjectDocument> {
    return prisma.projectDocument.update({
      where: { id },
      data: { status },
    });
  },

  /** Persist extracted text + AI analysis results after processing. */
  async saveAnalysis(
    id: string,
    data: UpdateAnalysisInput,
  ): Promise<ProjectDocument> {
    return prisma.projectDocument.update({
      where: { id },
      data: {
        ...(data.extractedText !== undefined && { extractedText: data.extractedText }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.summary !== undefined && { summary: data.summary }),
        ...(data.requirements !== undefined && {
          requirementsJson: data.requirements as never,
        }),
        ...(data.deadlines !== undefined && {
          deadlinesJson: data.deadlines as never,
        }),
        ...(data.risks !== undefined && {
          risksJson: data.risks as never,
        }),
        ...(data.suggestedTasks !== undefined && {
          suggestedTasksJson: data.suggestedTasks as never,
        }),
        ...(data.processedAt !== undefined && { processedAt: data.processedAt }),
      },
    });
  },

  /** Soft-delete a document. */
  async softDelete(id: string, userId: string): Promise<boolean> {
    const doc = await prisma.projectDocument.findFirst({
      where: {
        id,
        deletedAt: null,
        project: { ownerId: userId, deletedAt: null },
      },
      select: { id: true },
    });
    if (!doc) return false;

    await prisma.projectDocument.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return true;
  },
};
