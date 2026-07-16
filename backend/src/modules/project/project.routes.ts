import { Router } from "express";

import { requireAuth } from "../auth/index.js";
import {
  createProjectController,
  deleteProjectController,
  getDashboardStatsController,
  getProjectBySlugController,
  getProjectController,
  listProjectsController,
  updateProjectController,
} from "./project.controller.js";

/**
 * Project router — mounted at /api/v1/projects.
 *
 * Every route requires authentication. requireAuth runs once at the router
 * level (instead of per-handler) so a new endpoint can't accidentally ship
 * without auth — you'd have to explicitly opt out.
 */
const router: Router = Router();

router.use(requireAuth);

router.get("/", listProjectsController);
router.post("/", createProjectController);
router.get("/by-slug/:slug", getProjectBySlugController);
// stats/dashboard must be declared before /:id so "stats" isn't matched as an id
router.get("/stats/dashboard", getDashboardStatsController);
router.get("/:id", getProjectController);
router.patch("/:id", updateProjectController);
router.delete("/:id", deleteProjectController);

export { router as projectRouter };
