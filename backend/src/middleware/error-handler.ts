import { ValidationError } from "@/validators/parse";
import type { ErrorRequestHandler } from "express";

import { AppError } from "../lib/http-errors.js";
import type { ErrorEnvelope } from "../lib/response.js";

/**
 * Centralized error middleware — the LAST handler in the chain.
 *
 * Mapping policy:
 *   - AppError subclass         → its statusCode + code + message + details
 *   - ValidationError           → 400 with flattened field errors
 *   - anything else (unknown)   → 500 with a generic message; full error logged
 *
 * In production we NEVER leak stack traces or internal messages on 500. In
 * development we include the original message + stack for debugging.
 *
 * Every error response includes the requestId for support-case correlation.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const isProduction = process.env.NODE_ENV === "production";
  // pino-http types req.id as `string | number`; our genReqId always returns
  // string, but we coerce to satisfy ErrorEnvelope's narrower type.
  const requestId = req.id === undefined ? undefined : String(req.id);

  // 1. Known business errors
  if (err instanceof AppError) {
    const body: ErrorEnvelope = {
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined && { details: err.details }),
        requestId,
      },
    };
    req.log.warn({ err, statusCode: err.statusCode }, "request failed");
    res.status(err.statusCode).json(body);
    return;
  }

  // 2. Validation errors from @/validators
  if (err instanceof ValidationError) {
    const body: ErrorEnvelope = {
      error: {
        code: "VALIDATION_ERROR",
        message: "Input validation failed",
        errors: err.toFlatErrors(),
        requestId,
      },
    };
    req.log.warn({ issues: err.issues }, "validation failed");
    res.status(400).json(body);
    return;
  }

  // 3. Unknown — log full detail; respond opaquely.
  req.log.error({ err }, "unhandled error");
  const body: ErrorEnvelope = {
    error: {
      code: "INTERNAL_ERROR",
      message: isProduction
        ? "An unexpected error occurred"
        : err instanceof Error
          ? err.message
          : String(err),
      ...(isProduction ? {} : { details: err instanceof Error ? err.stack : undefined }),
      requestId,
    },
  };
  res.status(500).json(body);
};
