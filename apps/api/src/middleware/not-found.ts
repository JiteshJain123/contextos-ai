import type { RequestHandler } from "express";

import { NotFoundError } from "../lib/http-errors.js";

/**
 * 404 fallback.
 *
 * Mounted AFTER all routes but BEFORE the error handler. Forwarding a
 * NotFoundError to next() lets the error handler shape the JSON envelope —
 * consistent with every other error response.
 */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
};
