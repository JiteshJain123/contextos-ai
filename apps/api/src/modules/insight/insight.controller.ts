import { insightTypeParamSchema } from "@contextos-ai/validators/insight";
import { parseInput } from "@contextos-ai/validators/parse";
import type { RequestHandler } from "express";

import { BadRequestError, UnauthorizedError } from "../../lib/http-errors.js";
import { logger } from "../../lib/logger.js";
import { ok } from "../../lib/response.js";
import { insightServiceInstance } from "./index.js";

function requireUserId(req: Parameters<RequestHandler>[0]): string {
  if (!req.user) throw new UnauthorizedError();
  return req.user.id;
}

function requireParam(value: string | string[] | undefined, name: string): string {
  if (typeof value === "string" && value.length > 0) return value;
  throw new BadRequestError(`Missing path parameter: ${name}`);
}

export const listInsightsController: RequestHandler = async (req, res) => {
  const userId = requireUserId(req);
  const projectId = requireParam(req.params.projectId, "projectId");
  const insights = await insightServiceInstance.listInsights(projectId, userId);
  res.json(ok(insights));
};

export const deleteInsightController: RequestHandler = async (req, res) => {
  const userId = requireUserId(req);
  const projectId = requireParam(req.params.projectId, "projectId");
  const { type } = parseInput(insightTypeParamSchema, req.params);
  await insightServiceInstance.deleteInsight(projectId, type, userId);
  res.status(204).end();
};

export const dismissInsightController: RequestHandler = async (req, res) => {
  const userId = requireUserId(req);
  const projectId = requireParam(req.params.projectId, "projectId");
  const { type } = parseInput(insightTypeParamSchema, req.params);
  const insight = await insightServiceInstance.dismissInsight(projectId, type, userId);
  res.json(ok(insight));
};

export const undismissInsightController: RequestHandler = async (req, res) => {
  const userId = requireUserId(req);
  const projectId = requireParam(req.params.projectId, "projectId");
  const { type } = parseInput(insightTypeParamSchema, req.params);
  const insight = await insightServiceInstance.undismissInsight(projectId, type, userId);
  res.json(ok(insight));
};

/**
 * POST /projects/:projectId/insights/:type/generate — SSE streaming insight generation.
 *
 * Events:
 *   { type: "chunk",  content: "..." }     — partial markdown text
 *   { type: "done",   insightId: "..." }   — saved to DB, stream ends
 *   { type: "error",  message: "..." }     — fatal error mid-stream
 */
export const generateInsightController: RequestHandler = async (req, res) => {
  const userId = requireUserId(req);
  const projectId = requireParam(req.params.projectId, "projectId");
  const { type } = parseInput(insightTypeParamSchema, req.params);
  const force = req.query.force === "true";

  const generator = insightServiceInstance.generateInsight(projectId, type, userId, { force });

  // Peek first value to trigger validation before SSE headers commit.
  const first = await generator.next();

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  let clientDisconnected = false;
  req.on("close", () => {
    clientDisconnected = true;
    logger.debug({ projectId, type }, "insight SSE client disconnected");
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
    logger.error({ err, projectId, type }, "insight SSE error after headers committed");
    if (!res.writableEnded) {
      const message = err instanceof Error ? err.message : "Insight generation failed";
      sendEvent({ type: "error", message });
      res.end();
    }
  }
};
