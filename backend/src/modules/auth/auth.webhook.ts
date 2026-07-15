import { prisma } from "@/database";
import type { RequestHandler } from "express";
import { Webhook } from "svix";

import { env } from "../../env.js";
import { logger } from "../../lib/logger.js";

type ClerkUserEvent = {
  type: string;
  data: {
    id: string;
    email_addresses: Array<{ email_address: string; id: string }>;
    first_name: string | null;
    last_name: string | null;
    deleted?: boolean;
  };
};

/**
 * POST /api/webhooks/clerk
 *
 * Receives Clerk lifecycle events and syncs the user record to our DB.
 * svix signature verification ensures only genuine Clerk payloads are processed.
 *
 * Handled events:
 *   user.created  → upsert User row with clerkId + email + name
 *   user.updated  → update email + name
 *   user.deleted  → soft-delete User row
 *
 * The route must receive the RAW request body (mounted with express.raw())
 * so svix can verify the HMAC signature over the original bytes.
 */
export const clerkWebhookHandler: RequestHandler = async (req, res) => {
  const svixId = req.headers["svix-id"] as string;
  const svixTimestamp = req.headers["svix-timestamp"] as string;
  const svixSignature = req.headers["svix-signature"] as string;

  if (!svixId || !svixTimestamp || !svixSignature) {
    res.status(400).json({ error: "Missing svix headers" });
    return;
  }

  const wh = new Webhook(env.CLERK_WEBHOOK_SECRET);
  let evt: ClerkUserEvent;

  try {
    evt = wh.verify(req.body as Buffer, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkUserEvent;
  } catch (err) {
    logger.warn({ err }, "clerk-webhook: signature verification failed");
    res.status(400).json({ error: "Invalid webhook signature" });
    return;
  }

  const { type, data } = evt;
  logger.info({ type, clerkId: data.id }, "clerk-webhook: received event");

  try {
    if (type === "user.created" || type === "user.updated") {
      const email = data.email_addresses?.[0]?.email_address ?? "";
      const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || null;

      await prisma.user.upsert({
        where: { clerkId: data.id },
        create: { clerkId: data.id, email, name },
        update: { email, name },
      });

      logger.info({ clerkId: data.id, email }, `clerk-webhook: user ${type === "user.created" ? "created" : "updated"}`);
    }

    if (type === "user.deleted") {
      await prisma.user.updateMany({
        where: { clerkId: data.id },
        data: { deletedAt: new Date() },
      });
      logger.info({ clerkId: data.id }, "clerk-webhook: user soft-deleted");
    }
  } catch (err) {
    logger.error({ err, type, clerkId: data.id }, "clerk-webhook: DB operation failed");
    res.status(500).json({ error: "Webhook processing failed" });
    return;
  }

  res.json({ received: true });
};
