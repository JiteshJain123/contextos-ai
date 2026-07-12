import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware.js";
import {
  createMilestoneController,
  deleteMilestoneController,
  listMilestonesController,
  updateMilestoneController,
} from "./milestone.controller.js";

// Nested: /projects/:projectId/milestones
export const milestoneNestedRouter: Router = Router({ mergeParams: true });
milestoneNestedRouter.use(requireAuth);
milestoneNestedRouter.get("/", listMilestonesController);
milestoneNestedRouter.post("/", createMilestoneController);

// Flat: /milestones/:milestoneId
export const milestoneRouter: Router = Router();
milestoneRouter.use(requireAuth);
milestoneRouter.patch("/:milestoneId", updateMilestoneController);
milestoneRouter.delete("/:milestoneId", deleteMilestoneController);
