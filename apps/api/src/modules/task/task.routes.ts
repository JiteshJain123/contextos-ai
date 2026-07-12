import { Router } from "express";

import { requireAuth } from "../auth/index.js";
import {
  createTaskController,
  createTasksBatchController,
  deleteTaskController,
  listTasksController,
  updateTaskController,
  updateTaskStatusController,
} from "./task.controller.js";

export const taskNestedRouter: Router = Router({ mergeParams: true });
taskNestedRouter.use(requireAuth);
taskNestedRouter.get("/", listTasksController);
taskNestedRouter.post("/", createTaskController);
taskNestedRouter.post("/batch", createTasksBatchController);

export const taskRouter: Router = Router();
taskRouter.use(requireAuth);
taskRouter.patch("/:taskId", updateTaskController);
taskRouter.delete("/:taskId", deleteTaskController);
taskRouter.patch("/:taskId/status", updateTaskStatusController);
