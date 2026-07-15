import type { UserRole } from "@/database";

/**
 * Subject of an authenticated request.
 *
 * This is the narrow shape attached to `req.user` by the `requireAuth`
 * middleware after a valid access token is verified. It contains ONLY what
 * we need to authorize the current request — never the full User row.
 *
 * For the full profile, controllers should call the user service / load
 * from DB; this avoids accidentally exposing private fields through any
 * code path that reads `req.user`.
 */
export interface AuthenticatedUser {
  id: string;
  role: UserRole;
}

