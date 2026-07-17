import { prisma, type AiConversation, type AiMessage } from "@/database";

/**
 * AI data-access layer.
 *
 * Ownership is enforced by joining through Project (same pattern as tasks):
 *   conversation → project → ownerId = userId
 *
 * No bare `findById` methods exist — every query scopes by userId.
 */

export const aiRepository = {
  // ──────────────────────────────────────────
  // Conversations
  // ──────────────────────────────────────────

  async listForProject(
    projectId: string,
    userId: string,
  ): Promise<(AiConversation & { _count: { messages: number } })[]> {
    return prisma.aiConversation.findMany({
      where: { projectId, userId, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { messages: true } } },
    });
  },

  async findByIdForUser(
    conversationId: string,
    userId: string,
  ): Promise<(AiConversation & { _count: { messages: number } }) | null> {
    return prisma.aiConversation.findFirst({
      where: {
        id: conversationId,
        userId,
        deletedAt: null,
      },
      include: { _count: { select: { messages: true } } },
    });
  },

  async create(params: {
    projectId: string;
    userId: string;
    title?: string;
  }): Promise<AiConversation & { _count: { messages: number } }> {
    return prisma.aiConversation.create({
      data: {
        projectId: params.projectId,
        userId: params.userId,
        title: params.title ?? "New conversation",
      },
      include: { _count: { select: { messages: true } } },
    });
  },

  async updateTitle(conversationId: string, title: string): Promise<void> {
    await prisma.aiConversation.update({
      where: { id: conversationId },
      data: { title },
    });
  },

  async softDelete(conversationId: string, userId: string): Promise<number> {
    const result = await prisma.aiConversation.updateMany({
      where: { id: conversationId, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return result.count;
  },

  // ──────────────────────────────────────────
  // Messages
  // ──────────────────────────────────────────

  async listMessages(conversationId: string): Promise<AiMessage[]> {
    return prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });
  },

  async createMessage(params: {
    conversationId: string;
    role: "USER" | "ASSISTANT";
    content: string;
    promptTokens?: number;
    completionTokens?: number;
  }): Promise<AiMessage> {
    return prisma.aiMessage.create({
      data: {
        conversationId: params.conversationId,
        role: params.role,
        content: params.content,
        promptTokens: params.promptTokens ?? null,
        completionTokens: params.completionTokens ?? null,
      },
    });
  },
};
