import type { UserRole } from "@/database";
import { prisma } from "@/database";
import type { RequestHandler } from "express";
import { clerkClient, getAuth } from "@clerk/express";

import { ForbiddenError, UnauthorizedError } from "../../lib/http-errors.js";
import { logger } from "../../lib/logger.js";

/**
 * Just-in-time user provisioning.
 *
 * User rows are normally created by the Clerk webhook (auth.webhook.ts). But in
 * local dev Clerk can't reach localhost, so the webhook never fires and the
 * User table stays empty — every authenticated request would 401 with
 * "Account not found". We also don't want a genuine request to fail in prod if
 * a user.created webhook is missed or arrives late.
 *
 * So when an authenticated Clerk session has no matching DB row, we create it
 * from the Clerk profile. The upsert on the unique clerkId keeps this
 * idempotent even if the webhook lands at the same moment.
 */
async function provisionUserFromClerk(
  clerkId: string,
): Promise<{ id: string; role: UserRole }> {
  const clerkUser = await clerkClient.users.getUser(clerkId);
  const email =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress ??
    "";
  const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null;

  const user = await prisma.user.upsert({
    where: { clerkId },
    create: { clerkId, email, name },
    update: {},
    select: { id: true, role: true, deletedAt: true },
  });

  // A soft-deleted account should stay inaccessible — don't resurrect it.
  if (user.deletedAt) throw new UnauthorizedError("Account not found");

  logger.info({ clerkId, email }, "auth: provisioned user just-in-time");
  return { id: user.id, role: user.role };
}

/**
 * Verifies the Clerk session token, then looks up the user in our DB by clerkId.
 * Attaches req.user = { id, role } so all downstream handlers work unchanged.
 *
 * Requires clerkMiddleware() to be mounted globally in app.ts (it parses the
 * Authorization: Bearer token and attaches auth state to the request).
 */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const { userId: clerkId } = getAuth(req);
    if (!clerkId) throw new UnauthorizedError("Authentication required");

    const existing = await prisma.user.findFirst({
      where: { clerkId, deletedAt: null },
      select: { id: true, role: true },
    });

    // Not synced yet (webhook missed / local dev) — create the row on first hit.
    const user = existing ?? (await provisionUserFromClerk(clerkId));

    req.user = { id: user.id, role: user.role };
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Like requireAuth but doesn't throw if no session is present.
 * If a session IS present it is fully validated including the DB lookup.
 */
export const optionalAuth: RequestHandler = async (req, _res, next) => {
  try {
    const { userId: clerkId } = getAuth(req);
    if (!clerkId) {
      next();
      return;
    }

    const user = await prisma.user.findFirst({
      where: { clerkId, deletedAt: null },
      select: { id: true, role: true },
    });

    if (user) req.user = { id: user.id, role: user.role };
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Allow only specific roles. Must be used AFTER requireAuth.
 */
export function requireRole(...allowedRoles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(new UnauthorizedError("Authentication required"));
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      next(new ForbiddenError("Insufficient permissions"));
      return;
    }
    next();
  };
}
