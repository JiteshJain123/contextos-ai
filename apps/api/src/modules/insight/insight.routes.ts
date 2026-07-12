import { Router } from "express";

import { aiRateLimiter } from "../../config/rate-limit.js";
import { requireAuth } from "../auth/index.js";
import {
  deleteInsightController,
  dismissInsightController,
  generateInsightController,
  listInsightsController,
  undismissInsightController,
} from "./insight.controller.js";

/**
 * Insight router — mounted at /projects/:projectId/insights.
 *
 *   GET    /                     list all saved insights for the project
 *   DELETE /:type                delete one insight type
 *   POST   /:type/generate       stream AI analysis (SSE, rate-limited)
 *   PATCH  /:type/dismiss        soft-dismiss (hide) an insight
 *   PATCH  /:type/undismiss      restore a dismissed insight
 */
export const insightNestedRouter: Router = Router({ mergeParams: true });
insightNestedRouter.use(requireAuth);
insightNestedRouter.get("/", listInsightsController);
insightNestedRouter.delete("/:type", deleteInsightController);
insightNestedRouter.post("/:type/generate", aiRateLimiter, generateInsightController);
insightNestedRouter.patch("/:type/dismiss", dismissInsightController);
insightNestedRouter.patch("/:type/undismiss", undismissInsightController);
