import { Router } from "express";

import { aiNestedRouter, aiRouter } from "../../modules/ai/index.js";
import { planNestedRouter } from "../../modules/plan/index.js";
import { insightNestedRouter } from "../../modules/insight/index.js";
import { automationNestedRouter } from "../../modules/automation/index.js";
import { healthNestedRouter as projectHealthNestedRouter } from "../../modules/health/index.js";
import { projectRouter } from "../../modules/project/index.js";
import { taskNestedRouter, taskRouter } from "../../modules/task/index.js";
import { documentNestedRouter } from "../../modules/document/index.js";
import { memoryNestedRouter } from "../../modules/memory/index.js";
import { milestoneNestedRouter, milestoneRouter } from "../../modules/milestone/index.js";
import { calendarNestedRouter } from "../../modules/calendar/index.js";
import { healthRouter } from "./health.js";
import { debugRouter } from "./debug.js";

const v1Router: Router = Router();

v1Router.use("/health", healthRouter);
v1Router.use("/projects", projectRouter);
v1Router.use("/projects/:projectId/tasks", taskNestedRouter);
v1Router.use("/tasks", taskRouter);
v1Router.use("/projects/:projectId/conversations", aiNestedRouter);
v1Router.use("/conversations", aiRouter);
v1Router.use("/projects/:projectId/plan", planNestedRouter);
v1Router.use("/projects/:projectId/insights", insightNestedRouter);
v1Router.use("/projects/:projectId/automation", automationNestedRouter);
v1Router.use("/projects/:projectId/health", projectHealthNestedRouter);
v1Router.use("/projects/:projectId/documents", documentNestedRouter);
v1Router.use("/projects/:projectId/memory", memoryNestedRouter);
v1Router.use("/projects/:projectId/milestones", milestoneNestedRouter);
v1Router.use("/milestones", milestoneRouter);
v1Router.use("/projects/:projectId/calendar", calendarNestedRouter);
v1Router.use("/debug", debugRouter);

export { v1Router };
