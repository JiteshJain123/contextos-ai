/**
 * document.routes.ts
 *
 * Mounted at /projects/:projectId/documents (mergeParams: true).
 *
 * Uses multer for multipart uploads:
 *  - diskStorage saves files under uploads/{projectId}/
 *  - 10 MB file size limit
 *  - Allowed MIME types: PDF, DOCX, TXT, MD
 */

import { Router } from "express";
import multer from "multer";
import { extname } from "node:path";
import { randomUUID } from "node:crypto";
import type { Request, Response, NextFunction } from "express";

import { aiRateLimiter } from "../../config/rate-limit.js";
import { requireAuth } from "../auth/index.js";
import { BadRequestError } from "../../lib/http-errors.js";
import { ensureProjectDir } from "./document.service.js";
import {
  listDocumentsController,
  getDocumentController,
  uploadDocumentController,
  analyzeDocumentController,
  importTasksController,
  generatePlanController,
  deleteDocumentController,
} from "./document.controller.js";

// ── Multer Express type extension ─────────────────────────────────────────────
// multer adds `req.file` at runtime; expose the type for controllers.
export type MulterFile = Express.Multer.File;

// ── Allowed MIME types ────────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
]);

// ── Multer disk storage ───────────────────────────────────────────────────────

const storage = multer.diskStorage({
  destination: (req: Request, _file, cb) => {
    const projectId =
      (Array.isArray(req.params.projectId)
        ? req.params.projectId[0]
        : req.params.projectId) ?? "unknown";

    ensureProjectDir(projectId)
      .then((dir) => cb(null, dir))
      .catch((err: unknown) =>
        cb(err instanceof Error ? err : new Error(String(err)), ""),
      );
  },
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase() || ".bin";
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Unsupported file type: ${file.mimetype}. Allowed: PDF, DOCX, TXT, Markdown`,
        ),
      );
    }
  },
});

// ── Multer error → AppError bridge ───────────────────────────────────────────
// Converts multer-specific errors (wrong type, size limit) into BadRequestError
// so the error handler returns a well-formed 400 instead of a generic 500.

function handleUpload(req: Request, res: Response, next: NextFunction): void {
  upload.single("file")(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }

    if (err instanceof multer.MulterError) {
      const message =
        err.code === "LIMIT_FILE_SIZE"
          ? "File too large. Maximum size is 10 MB."
          : `Upload error: ${err.message}`;
      next(new BadRequestError(message));
    } else if (err instanceof Error) {
      next(new BadRequestError(err.message));
    } else {
      next(new BadRequestError("Upload failed"));
    }
  });
}

// ── Router ────────────────────────────────────────────────────────────────────

export const documentNestedRouter: Router = Router({ mergeParams: true });
documentNestedRouter.use(requireAuth);

documentNestedRouter.get("/", listDocumentsController);
documentNestedRouter.get("/:docId", getDocumentController);
documentNestedRouter.post("/", handleUpload, uploadDocumentController);
documentNestedRouter.post("/:docId/analyze", aiRateLimiter, analyzeDocumentController);
documentNestedRouter.post("/:docId/import-tasks", importTasksController);
documentNestedRouter.post("/:docId/generate-plan", aiRateLimiter, generatePlanController);
documentNestedRouter.delete("/:docId", deleteDocumentController);
