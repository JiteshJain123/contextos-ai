/**
 * document.controller.ts
 *
 * HTTP request handlers for the document module.
 *
 *  GET    /projects/:projectId/documents              list
 *  GET    /projects/:projectId/documents/:docId       single doc
 *  POST   /projects/:projectId/documents              upload (multipart)
 *  POST   /projects/:projectId/documents/:docId/analyze  SSE analysis
 *  POST   /projects/:projectId/documents/:docId/import-tasks  import tasks
 *  DELETE /projects/:projectId/documents/:docId       soft-delete
 */

import { parseInput } from "@/validators/parse";
import { importTasksFromDocumentSchema } from "@/validators/document";
import type { RequestHandler } from "express";
import type { MulterFile } from "./document.routes.js";

import { BadRequestError, UnauthorizedError } from "../../lib/http-errors.js";
import { logger } from "../../lib/logger.js";
import { ok } from "../../lib/response.js";
import { documentServiceInstance, shapedDocument } from "./index.js";

function requireUserId(req: Parameters<RequestHandler>[0]): string {
  if (!req.user) throw new UnauthorizedError();
  return req.user.id;
}

function requireParam(value: string | string[] | undefined, name: string): string {
  if (typeof value === "string" && value.length > 0) return value;
  throw new BadRequestError(`Missing path parameter: ${name}`);
}

// ── List ─────────────────────────────────────────────────────────────────────

export const listDocumentsController: RequestHandler = async (req, res) => {
  const userId = requireUserId(req);
  const projectId = requireParam(req.params.projectId, "projectId");
  const docs = await documentServiceInstance.listDocuments(projectId, userId);
  res.json(ok(docs.map(shapedDocument)));
};

// ── Get one ───────────────────────────────────────────────────────────────────

export const getDocumentController: RequestHandler = async (req, res) => {
  const userId = requireUserId(req);
  const docId = requireParam(req.params.docId, "docId");
  const doc = await documentServiceInstance.getDocument(docId, userId);
  res.json(ok(shapedDocument(doc)));
};

// ── Upload ────────────────────────────────────────────────────────────────────

export const uploadDocumentController: RequestHandler = async (req, res) => {
  const userId = requireUserId(req);
  const projectId = requireParam(req.params.projectId, "projectId");

  const file = req.file as MulterFile | undefined;
  if (!file) throw new BadRequestError("No file uploaded");

  const doc = await documentServiceInstance.createDocument({
    projectId,
    uploadedById: userId,
    filename: file.filename,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
  });

  logger.info({ docId: doc.id, projectId, filename: file.filename }, "document: uploaded");
  res.status(201).json(ok(shapedDocument(doc)));
};

// ── Analyze (SSE) ─────────────────────────────────────────────────────────────

export const analyzeDocumentController: RequestHandler = async (req, res) => {
  const userId = requireUserId(req);
  const docId = requireParam(req.params.docId, "docId");

  const generator = documentServiceInstance.analyzeDocument(docId, userId);

  // Peek first value before committing SSE headers
  const first = await generator.next();

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  let clientDisconnected = false;
  req.on("close", () => {
    clientDisconnected = true;
    logger.debug({ docId }, "document SSE client disconnected");
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
    logger.error({ err, docId }, "document SSE error after headers committed");
    if (!res.writableEnded) {
      sendEvent({ type: "error", message: "Document analysis failed. Please try again." });
      res.end();
    }
  }
};

// ── Import tasks ──────────────────────────────────────────────────────────────

export const importTasksController: RequestHandler = async (req, res) => {
  const userId = requireUserId(req);
  const docId = requireParam(req.params.docId, "docId");
  const input = parseInput(importTasksFromDocumentSchema, req.body);
  const tasks = await documentServiceInstance.importTasks(docId, userId, input);
  res.status(201).json(ok(tasks));
};

// ── Generate Plan (SSE) ───────────────────────────────────────────────────────

export const generatePlanController: RequestHandler = async (req, res) => {
  const userId = requireUserId(req);
  const docId = requireParam(req.params.docId, "docId");

  const generator = documentServiceInstance.generatePlan(docId, userId);
  const first = await generator.next();

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  let clientDisconnected = false;
  req.on("close", () => {
    clientDisconnected = true;
    logger.debug({ docId }, "plan SSE client disconnected");
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
    logger.error({ err, docId }, "plan SSE error after headers committed");
    if (!res.writableEnded) {
      sendEvent({ type: "plan_error", message: "Plan generation failed. Please try again." });
      res.end();
    }
  }
};

// ── Delete ────────────────────────────────────────────────────────────────────

export const deleteDocumentController: RequestHandler = async (req, res) => {
  const userId = requireUserId(req);
  const docId = requireParam(req.params.docId, "docId");
  await documentServiceInstance.deleteDocument(docId, userId);
  res.status(204).end();
};
