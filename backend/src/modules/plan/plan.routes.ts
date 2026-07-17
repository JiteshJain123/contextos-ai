import { Router } from "express";

import { aiRateLimiter } from "../../config/rate-limit.js";
import { requireAuth } from "../auth/index.js";
import {
  deletePlanController,
  generatePlanController,
  getPlanController,
  updatePlanController,
} from "./plan.controller.js";

/**
 * Plan router — mounted at /projects/:projectId/plan.
 *
 * Uses mergeParams: true so req.params.projectId is available from the parent.
 *
 *   GET    /         fetch current plan (null if none)
 *   PATCH  /         update plan markdown / goal
 *   DELETE /         delete the plan
 *   POST   /generate stream AI plan generation (SSE, rate-limited)
 */
export const planNestedRouter: Router = Router({ mergeParams: true });
planNestedRouter.use(requireAuth);
planNestedRouter.get("/", getPlanController);
planNestedRouter.patch("/", updatePlanController);
planNestedRouter.delete("/", deletePlanController);
planNestedRouter.post("/generate", aiRateLimiter, generatePlanController);
