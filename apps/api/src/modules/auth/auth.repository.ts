import { prisma, type Session, type User } from "@contextos-ai/database";

/**
 * Data-access layer for the auth domain.
 *
 * The repository is the ONLY place that touches `prisma.user` / `prisma.session`
 * directly. The service layer asks for "find this user" or "rotate this session"
 * — never composes its own Prisma queries.
 *
 * Why this split:
 *   - Replaceable: if we ever switch ORM (Drizzle, raw SQL), one file changes
 *   - Testable: the service can mock the repository
 *   - Discoverable: every DB read/write is in one place to audit
 */

export const authRepository = {
  // ============== User ==============

  async findUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
  },

  async findUserById(id: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
  },

  async createUser(input: { email: string; passwordHash: string; name?: string }): Promise<User> {
    return prisma.user.create({
      data: {
        email: input.email,
        passwordHash: input.passwordHash,
        name: input.name ?? null,
      },
    });
  },

  // ============== Session ==============

  async createSession(input: {
    userId: string;
    refreshTokenHash: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<Session> {
    return prisma.session.create({
      data: {
        userId: input.userId,
        refreshTokenHash: input.refreshTokenHash,
        expiresAt: input.expiresAt,
        userAgent: input.userAgent ?? null,
        ipAddress: input.ipAddress ?? null,
      },
    });
  },

  /**
   * Look up a session by its refresh-token hash.
   * Returns null if not found OR if expired (single round-trip).
   */
  async findValidSessionByRefreshHash(refreshTokenHash: string): Promise<Session | null> {
    return prisma.session.findFirst({
      where: {
        refreshTokenHash,
        expiresAt: { gt: new Date() },
      },
    });
  },

  async deleteSessionById(id: string): Promise<void> {
    await prisma.session.delete({ where: { id } });
  },

  /**
   * Delete EVERY session for a user. Use cases:
   *   - logout-all-devices endpoint
   *   - refresh-token-replay detection (advanced — kill all sessions on suspicion)
   *   - password change
   */
  async deleteAllSessionsForUser(userId: string): Promise<void> {
    await prisma.session.deleteMany({ where: { userId } });
  },
};
