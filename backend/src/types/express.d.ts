/**
 * Augments the Express.Request type with fields populated by our middleware.
 *
 * - `req.id`   set by pino-http's genReqId (UUID or propagated X-Request-Id)
 * - `req.log`  set by pino-http (child logger with reqId bound)
 * - `req.user` set by the auth middleware (requireAuth / optionalAuth)
 *
 * pino-http already provides req.id + req.log; we re-declare for clarity.
 * req.user is our addition.
 */

import type { Logger } from "pino";

import type { AuthenticatedUser } from "../modules/auth/auth.types.ts";

declare global {
  namespace Express {
    interface Request {
      id: string;
      log: Logger;
      /** Set by requireAuth / optionalAuth — undefined for unauthenticated routes. */
      user?: AuthenticatedUser;
    }
  }
}

// Required for the file to be treated as a module by TypeScript.
export {};
