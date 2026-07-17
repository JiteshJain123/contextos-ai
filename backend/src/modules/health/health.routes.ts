import { Router } from "express";

import { requireAuth } from "../auth/index.js";
import { computeHealthController, getHealthController } from "./health.controller.js";

/**
 * Health router — mounted at /projects/:projectId/health.
 *
 *   GET  /         — return cached health score (auto-computes if missing)
 *   POST /compute  — force recompute and persist health score
 */
export const healthNestedRouter: Router = Router({ mergeParams: true });
healthNestedRouter.use(requireAuth);
healthNestedRouter.get("/", getHealthController);
healthNestedRouter.post("/compute", computeHealthController);
