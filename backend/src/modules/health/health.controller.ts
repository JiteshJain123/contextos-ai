import type { RequestHandler } from "express";

import { BadRequestError, UnauthorizedError } from "../../lib/http-errors.js";
import { ok } from "../../lib/response.js";
import { healthService } from "./health.service.js";

function requireUserId(req: Parameters<RequestHandler>[0]): string {
  if (!req.user) throw new UnauthorizedError();
  return req.user.id;
}

function requireParam(value: string | string[] | undefined, name: string): string {
  if (typeof value === "string" && value.length > 0) return value;
  throw new BadRequestError(`Missing path parameter: ${name}`);
}

/** GET /projects/:projectId/health — return or auto-compute project health score */
export const getHealthController: RequestHandler = async (req, res) => {
  const userId = requireUserId(req);
  const projectId = requireParam(req.params.projectId, "projectId");
  const health = await healthService.getHealth(projectId, userId);
  res.json(ok(health));
};

/** POST /projects/:projectId/health/compute — force recompute + store */
export const computeHealthController: RequestHandler = async (req, res) => {
  const userId = requireUserId(req);
  const projectId = requireParam(req.params.projectId, "projectId");
  const health = await healthService.computeAndStore(projectId, userId);
  res.json(ok(health));
};
