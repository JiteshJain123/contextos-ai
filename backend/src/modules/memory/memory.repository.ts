/**
 * memory.repository.ts
 *
 * Data access layer for ProjectMemory + MemoryChunk tables.
 * All methods enforce project ownership via JOIN through Project.
 */

import { prisma } from "@/database";
import type { MemorySource } from "@/validators/memory";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CreateMemoryInput {
  projectId: string;
  snapshotVersion: number;
  tasksJson: object;
  documentsJson: object;
  insightsJson: object;
  conversationsJson: object;
  planJson?: object | null;
  teamJson: object;
  metricsJson: object;
  totalChunks: number;
}

export interface CreateChunkInput {
  memoryId: string;
  sourceType: MemorySource;
  sourceId: string;
  content: string;
  embedding: number[] | null;
  metadata: object | null;
  chunkIndex: number;
}

// ── Repository ────────────────────────────────────────────────────────────────

export const memoryRepository = {
  /** Find memory for a project (ownership verified via project join). */
  async findByProject(projectId: string, userId: string) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, ownerId: userId, deletedAt: null },
      select: { id: true },
    });
    if (!project) return null;

    return prisma.projectMemory.findUnique({
      where: { projectId },
    });
  },

  /** Get all chunks for a project memory (used for semantic search). */
  async findChunks(
    projectId: string,
    sourceTypes?: MemorySource[],
  ) {
    const memory = await prisma.projectMemory.findUnique({
      where: { projectId },
      select: { id: true },
    });
    if (!memory) return [];

    return prisma.memoryChunk.findMany({
      where: {
        memoryId: memory.id,
        ...(sourceTypes && sourceTypes.length > 0 ? { sourceType: { in: sourceTypes } } : {}),
      },
      select: {
        id: true,
        sourceType: true,
        sourceId: true,
        content: true,
        embedding: true,
        metadata: true,
        chunkIndex: true,
        createdAt: true,
      },
      orderBy: { chunkIndex: "asc" },
    });
  },

  /**
   * Upsert the full memory snapshot:
   * 1. Delete existing memory (cascades to chunks)
   * 2. Create new memory record
   * Returns the new memory id.
   */
  async upsertMemory(input: CreateMemoryInput): Promise<string> {
    // Get current version before deleting
    const current = await prisma.projectMemory.findUnique({
      where: { projectId: input.projectId },
      select: { snapshotVersion: true },
    });

    // Delete existing (cascades chunks)
    await prisma.projectMemory.deleteMany({ where: { projectId: input.projectId } });

    const memory = await prisma.projectMemory.create({
      data: {
        projectId: input.projectId,
        snapshotVersion: (current?.snapshotVersion ?? 0) + 1,
        tasksJson: input.tasksJson as never,
        documentsJson: input.documentsJson as never,
        insightsJson: input.insightsJson as never,
        conversationsJson: input.conversationsJson as never,
        planJson: input.planJson as never ?? undefined,
        teamJson: input.teamJson as never,
        metricsJson: input.metricsJson as never,
        totalChunks: input.totalChunks,
        builtAt: new Date(),
      },
    });

    return memory.id;
  },

  /** Bulk-insert memory chunks. Splits into batches of 500 to stay within limits. */
  async createChunks(chunks: CreateChunkInput[]): Promise<void> {
    if (chunks.length === 0) return;

    const BATCH = 500;
    for (let i = 0; i < chunks.length; i += BATCH) {
      const batch = chunks.slice(i, i + BATCH);
      await prisma.memoryChunk.createMany({
        data: batch.map((c) => ({
          memoryId: c.memoryId,
          sourceType: c.sourceType,
          sourceId: c.sourceId,
          content: c.content,
          embedding: c.embedding as never ?? undefined,
          metadata: c.metadata as never ?? undefined,
          chunkIndex: c.chunkIndex,
        })),
      });
    }
  },

  /** Get the most recent memory for the project (no auth — internal use only). */
  async findByProjectInternal(projectId: string) {
    return prisma.projectMemory.findUnique({ where: { projectId } });
  },

  /** Delete all memory data for a project. */
  async deleteByProject(projectId: string): Promise<void> {
    await prisma.projectMemory.deleteMany({ where: { projectId } });
  },
};
