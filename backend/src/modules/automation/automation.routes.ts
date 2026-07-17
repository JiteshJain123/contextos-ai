import { Router } from "express";

import { requireAuth } from "../auth/index.js";
import { automationHistoryController, detectTriggersController } from "./automation.controller.js";

/**
 * Automation router — mounted at /projects/:projectId/automation.
 *
 *   GET /detect    — run detection engine, return triggered insight types + severity
 *   GET /history   — list recent AutomationRun records for this project
 */
export const automationNestedRouter: Router = Router({ mergeParams: true });
automationNestedRouter.use(requireAuth);
automationNestedRouter.get("/detect", detectTriggersController);
automationNestedRouter.get("/history", automationHistoryController);
