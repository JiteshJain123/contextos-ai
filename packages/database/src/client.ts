import { PrismaClient } from "@prisma/client";

/**
 * Singleton Prisma client for Prisma 5.
 *
 * Prevents exhausting DB connections during Next.js hot reloads
 * by caching PrismaClient on globalThis in development.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}