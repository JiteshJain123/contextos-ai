import {
  batchCreateTasksSchema,
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
} from "@contextos-ai/validators/task";
import { parseInput } from "@contextos-ai/validators/parse";
import type { RequestHandler } from "express";

import { BadRequestError, UnauthorizedError } from "../../lib/http-errors.js";
import { created, ok } from "../../lib/response.js";
import { taskService } from "./task.service.js";

function requireUserId(req: Parameters<RequestHandler>[0]): string {
  if (!req.user) throw new UnauthorizedError();
  return req.user.id;
}

function requireParam(value: string | string[] | undefined, name: string): string {
  if (typeof value === "string" && value.length > 0) return value;
  throw new BadRequestError(`Missing path parameter: ${name}`);
}

// ============== Nested: /projects/:projectId/tasks ==============

export const listTasksController: RequestHandler = async (req, res) => {
  const userId = requireUserId(req);
  const projectId = requireParam(req.params.projectId, "projectId");
  const tasks = await taskService.list(projectId, userId);
  res.json(ok(tasks));
};

export const createTaskController: RequestHandler = async (req, res) => {
  const userId = requireUserId(req);
  const projectId = requireParam(req.params.projectId, "projectId");
  const input = parseInput(createTaskSchema, req.body);
  const task = await taskService.create(projectId, userId, input);
  res.status(201).json(created(task));
};

export const createTasksBatchController: RequestHandler = async (req, res) => {
  const userId = requireUserId(req);
  const projectId = requireParam(req.params.projectId, "projectId");
  const input = parseInput(batchCreateTasksSchema, req.body);
  const tasks = await taskService.createBulk(projectId, userId, input.tasks);
  res.status(201).json(created(tasks));
};

// ============== Flat: /tasks/:taskId ==============

export const updateTaskController: RequestHandler = async (req, res) => {
  const userId = requireUserId(req);
  const taskId = requireParam(req.params.taskId, "taskId");
  const input = parseInput(updateTaskSchema, req.body);
  const task = await taskService.update(taskId, userId, input);
  res.json(ok(task));
};

export const deleteTaskController: RequestHandler = async (req, res) => {
  const userId = requireUserId(req);
  const taskId = requireParam(req.params.taskId, "taskId");
  await taskService.delete(taskId, userId);
  res.status(204).end();
};

export const updateTaskStatusController: RequestHandler = async (req, res) => {
  const userId = requireUserId(req);
  const taskId = requireParam(req.params.taskId, "taskId");
  const input = parseInput(updateTaskStatusSchema, req.body);
  const task = await taskService.updateStatus(taskId, userId, input);
  res.json(ok(task));
};
