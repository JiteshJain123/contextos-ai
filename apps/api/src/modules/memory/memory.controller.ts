import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/async-handler.js";
import { ok } from "../../lib/response.js";
import { BadRequestError } from "../../lib/http-errors.js";
import { logger } from "../../lib/logger.js";
import type { MemoryService, MemoryStreamEvent } from "./memory.service.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function writeSseEvent(res: Response, data: object): void {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function getParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

// ── Controller factory ────────────────────────────────────────────────────────

export function createMemoryController(memoryService: MemoryService) {
  return {
    /** GET /projects/:projectId/memory */
    getMemory: asyncHandler(async (req: Request, res: Response) => {
      const projectId = getParam(req.params.projectId);
      const userId = req.user!.id;

      const memory = await memoryService.getMemory(projectId, userId);

      return res.json(ok(memory));
    }),

    /** POST /projects/:projectId/memory/rebuild */
    rebuildMemory: asyncHandler(async (req: Request, res: Response) => {
      const projectId = getParam(req.params.projectId);
      const userId = req.user!.id;

      // SSE headers
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");

      res.flushHeaders();

      let clientDisconnected = false;

      req.on("close", () => {
        clientDisconnected = true;
      });

      try {
        const generator = memoryService.buildMemory(projectId, userId);

        for await (const event of generator) {
          if (clientDisconnected) break;

          writeSseEvent(res, event);

          const flushable = res as Response & {
            flush?: () => void;
          };

          flushable.flush?.();

          if (event.type === "done" || event.type === "error") {
            break;
          }
        }
      } catch (err) {
        logger.error(
          {
            err,
            projectId,
          },
          "memory.controller: rebuild failed",
        );

        if (!clientDisconnected) {
          const errorEvent: MemoryStreamEvent = {
            type: "error",
            message:
              err instanceof Error
                ? err.message
                : "Memory rebuild failed",
          };

          writeSseEvent(res, errorEvent);
        }
      } finally {
        res.end();
      }
    }),

    /** DELETE /projects/:projectId/memory */
    clearMemory: asyncHandler(async (req: Request, res: Response) => {
      const projectId = getParam(req.params.projectId);
      const userId = req.user!.id;

      await memoryService.clearMemory(projectId, userId);

      return res.json(ok(null));
    }),

    /** GET /projects/:projectId/memory/rag?query=... */
    getRAGContext: asyncHandler(async (req: Request, res: Response) => {
      const projectId = getParam(req.params.projectId);

      const query =
        typeof req.query.query === "string"
          ? req.query.query
          : "";

      if (!query || query.trim().length < 2) {
        throw new BadRequestError(
          "query parameter required (min 2 chars)",
        );
      }

      const ragContext = await memoryService.getRAGContext(
        projectId,
        query.trim(),
      );

      return res.json(ok(ragContext));
    }),
  };
}
