import { generatePlanInputSchema, updatePlanSchema } from "@contextos-ai/validators/plan";
import { parseInput } from "@contextos-ai/validators/parse";
import type { RequestHandler } from "express";

import { BadRequestError, UnauthorizedError } from "../../lib/http-errors.js";
import { logger } from "../../lib/logger.js";
import { ok } from "../../lib/response.js";
import { planServiceInstance } from "./index.js";

function requireUserId(req: Parameters<RequestHandler>[0]): string {
  if (!req.user) throw new UnauthorizedError();
  return req.user.id;
}

function requireParam(value: string | string[] | undefined, name: string): string {
  if (typeof value === "string" && value.length > 0) return value;
  throw new BadRequestError(`Missing path parameter: ${name}`);
}

export const getPlanController: RequestHandler = async (req, res) => {
  const userId = requireUserId(req);
  const projectId = requireParam(req.params.projectId, "projectId");
  const plan = await planServiceInstance.getPlan(projectId, userId);
  res.json(ok(plan));
};

export const updatePlanController: RequestHandler = async (req, res) => {
  const userId = requireUserId(req);
  const projectId = requireParam(req.params.projectId, "projectId");
  const input = parseInput(updatePlanSchema, req.body);
  const plan = await planServiceInstance.updatePlan(projectId, userId, input);
  res.json(ok(plan));
};

export const deletePlanController: RequestHandler = async (req, res) => {
  const userId = requireUserId(req);
  const projectId = requireParam(req.params.projectId, "projectId");
  await planServiceInstance.deletePlan(projectId, userId);
  res.status(204).end();
};

/**
 * POST /projects/:projectId/plan/generate — SSE streaming plan generation.
 *
 * Events:
 *   { type: "chunk",       content: "..." }       — partial markdown text
 *   { type: "tasks_saved", count: N }             — tasks written to DB
 *   { type: "done",        planId: "..." }         — plan saved, stream ends
 *   { type: "error",       message: "..." }        — fatal error mid-stream
 */
export const generatePlanController: RequestHandler = async (req, res) => {
  const userId = requireUserId(req);
  const projectId = requireParam(req.params.projectId, "projectId");
  const { goal } = parseInput(generatePlanInputSchema, req.body);

  const generator = planServiceInstance.generatePlan(projectId, userId, goal);

  // Peek first value to trigger ownership validation before SSE headers are sent.
  const first = await generator.next();

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  let clientDisconnected = false;
  req.on("close", () => {
    clientDisconnected = true;
    logger.debug({ projectId }, "plan SSE client disconnected");
  });

  function sendEvent(data: object) {
    if (!clientDisconnected && !res.writableEnded) {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  }

  try {
    if (!first.done) {
      sendEvent(first.value);
      for await (const event of generator) {
        sendEvent(event);
      }
    }
    if (!res.writableEnded) res.end();
  } catch (err) {
    logger.error({ err, projectId }, "plan SSE stream error after headers committed");
    if (!res.writableEnded) {
      const message = err instanceof Error ? err.message : "Plan generation failed";
      sendEvent({ type: "error", message });
      res.end();
    }
  }
};
