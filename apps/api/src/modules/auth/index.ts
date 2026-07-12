/**
 * Public surface of the auth module.
 *
 * Other modules import middleware + types from here; the router is mounted
 * by `routes/v1/index.ts`.
 */
export { authRouter } from "./auth.routes.js";
export { optionalAuth, requireAuth, requireRole } from "./auth.middleware.js";
export type { AuthenticatedUser } from "./auth.types.js";
