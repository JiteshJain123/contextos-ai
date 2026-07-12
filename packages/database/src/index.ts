/**
 * @contextos-ai/database — public surface
 *
 * Apps import the singleton client and Prisma types from here. Direct imports
 * from @prisma/client are discouraged; this package is the database boundary.
 *
 * Example:
 *   import { prisma, type User } from "@contextos-ai/database";
 *
 *   const user = await prisma.user.findUnique({ where: { id } });
 */

export { prisma } from "./client";
export * from "@prisma/client";
