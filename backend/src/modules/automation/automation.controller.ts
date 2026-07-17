import type { RequestHandler } from "express";

import { BadRequestError, UnauthorizedError } from "../../lib/http-errors.js";
import { ok } from "../../lib/response.js";
import { automationService } from "./automation.service.js";

function requireUserId(req: Parameters<RequestHandler>[0]): string {
  if (!req.user) throw new UnauthorizedError();
  return req.user.id;
}

function requireParam(value: string | string[] | undefined, name: string): string {
  if (typeof value === "string" && value.length > 0) return value;
  throw new BadRequestError(`Missing path parameter: ${name}`);
}

/** GET /projects/:projectId/automation/detect */
export const detectTriggersController: RequestHandler = async (req, res) => {
  const userId = requireUserId(req);
  const projectId = requireParam(req.params.projectId, "projectId");

  const detections = await automationService.detectTriggers(projectId, userId);

  res.json(
    ok({
      detections,
      projectId,
      detectedAt: new Date().toISOString(),
    }),
  );
};

/** GET /projects/:projectId/automation/history */
export const automationHistoryController: RequestHandler = async (req, res) => {
  const userId = requireUserId(req);
  const projectId = requireParam(req.params.projectId, "projectId");

  const history = await automationService.listHistory(projectId, userId);
  res.json(ok(history));
};
