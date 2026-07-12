import { createProjectSchema, updateProjectSchema } from "@contextos-ai/validators/project";
import { paginationParamsSchema } from "@contextos-ai/validators/pagination";
import { parseInput } from "@contextos-ai/validators/parse";
import type { RequestHandler } from "express";

import { BadRequestError, UnauthorizedError } from "../../lib/http-errors.js";
import { created, ok, paginated } from "../../lib/response.js";
import { projectService } from "./project.service.js";

/**
 * Project HTTP controllers.
 *
 * Each handler:
 *   1. Asserts req.user (set by requireAuth middleware — defensive in case of misconfig)
 *   2. Parses input via shared Zod schemas (throws ValidationError on failure)
 *   3. Calls the service
 *   4. Wraps the result in our standard JSON envelope
 */

function requireUserId(req: Parameters<RequestHandler>[0]): string {
  if (!req.user) throw new UnauthorizedError();
  return req.user.id;
}

/**
 * Express 5 types path params as `string | string[]` (defensive against
 * duplicate-segment URL patterns). For our single-segment :id routes the
 * value is always a string — this helper narrows it once for all callers.
 */
function requireParam(value: string | string[] | undefined, name: string): string {
  if (typeof value === "string" && value.length > 0) return value;
  throw new BadRequestError(`Missing path parameter: ${name}`);
}

export const listProjectsController: RequestHandler = async (req, res) => {
  const userId = requireUserId(req);
  const params = parseInput(paginationParamsSchema, req.query);
  const { items, total } = await projectService.list(userId, {
    page: params.page,
    pageSize: params.pageSize,
    sortOrder: params.sortOrder,
  });
  res.json(paginated(items, { page: params.page, pageSize: params.pageSize, total }));
};

export const getProjectController: RequestHandler = async (req, res) => {
  const userId = requireUserId(req);
  const id = requireParam(req.params.id, "id");
  const project = await projectService.getById(id, userId);
  res.json(ok(project));
};

export const createProjectController: RequestHandler = async (req, res) => {
  const userId = requireUserId(req);
  const input = parseInput(createProjectSchema, req.body);
  const project = await projectService.create(userId, input);
  res.status(201).json(created(project));
};

export const updateProjectController: RequestHandler = async (req, res) => {
  const userId = requireUserId(req);
  const id = requireParam(req.params.id, "id");
  const input = parseInput(updateProjectSchema, req.body);
  const project = await projectService.update(id, userId, input);
  res.json(ok(project));
};

export const deleteProjectController: RequestHandler = async (req, res) => {
  const userId = requireUserId(req);
  const id = requireParam(req.params.id, "id");
  await projectService.delete(id, userId);
  res.status(204).end();
};

export const getDashboardStatsController: RequestHandler = async (req, res) => {
  const userId = requireUserId(req);
  const stats = await projectService.getDashboardStats(userId);
  res.json(ok(stats));
};

export const getProjectBySlugController: RequestHandler = async (req, res) => {
  const userId = requireUserId(req);
  const slug = requireParam(req.params.slug, "slug");
  const project = await projectService.getBySlug(slug, userId);
  res.json(ok(project));
};
