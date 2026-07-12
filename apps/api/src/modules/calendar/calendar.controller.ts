import type { RequestHandler } from "express";
import { UnauthorizedError, BadRequestError } from "../../lib/http-errors.js";
import { ok } from "../../lib/response.js";
import { calendarService } from "./calendar.service.js";

function requireUserId(req: Parameters<RequestHandler>[0]): string {
  if (!req.user) throw new UnauthorizedError();
  return req.user.id;
}

function requireParam(value: string | string[] | undefined, name: string): string {
  if (typeof value === "string" && value.length > 0) return value;
  throw new BadRequestError(`Missing path parameter: ${name}`);
}

// GET /projects/:projectId/calendar
export const getCalendarDataController: RequestHandler = async (req, res) => {
  const userId = requireUserId(req);
  const projectId = requireParam(req.params.projectId, "projectId");
  const data = await calendarService.getCalendarData(projectId, userId);
  res.json(ok(data));
};
