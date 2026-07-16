import type { RequestHandler } from "express";
import { parseInput } from "@/validators/parse";
import { createMilestoneSchema, updateMilestoneSchema } from "@/validators/milestone";
import { UnauthorizedError, BadRequestError } from "../../lib/http-errors.js";
import { ok, created } from "../../lib/response.js";
import { milestoneService } from "./milestone.service.js";

function requireUserId(req: Parameters<RequestHandler>[0]): string {
  if (!req.user) throw new UnauthorizedError();
  return req.user.id;
}

function requireParam(value: string | string[] | undefined, name: string): string {
  if (typeof value === "string" && value.length > 0) return value;
  throw new BadRequestError(`Missing path parameter: ${name}`);
}

// GET /projects/:projectId/milestones
export const listMilestonesController: RequestHandler = async (req, res) => {
  const userId = requireUserId(req);
  const projectId = requireParam(req.params.projectId, "projectId");
  const milestones = await milestoneService.list(projectId, userId);
  res.json(ok(milestones));
};

// POST /projects/:projectId/milestones
export const createMilestoneController: RequestHandler = async (req, res) => {
  const userId = requireUserId(req);
  const projectId = requireParam(req.params.projectId, "projectId");
  const input = parseInput(createMilestoneSchema, req.body);
  const milestone = await milestoneService.create(projectId, userId, input);
  res.status(201).json(created(milestone));
};

// PATCH /milestones/:milestoneId
export const updateMilestoneController: RequestHandler = async (req, res) => {
  const userId = requireUserId(req);
  const milestoneId = requireParam(req.params.milestoneId, "milestoneId");
  const input = parseInput(updateMilestoneSchema, req.body);
  const milestone = await milestoneService.update(milestoneId, userId, input);
  res.json(ok(milestone));
};

// DELETE /milestones/:milestoneId
export const deleteMilestoneController: RequestHandler = async (req, res) => {
  const userId = requireUserId(req);
  const milestoneId = requireParam(req.params.milestoneId, "milestoneId");
  await milestoneService.delete(milestoneId, userId);
  res.status(204).end();
};
