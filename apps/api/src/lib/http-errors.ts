/**
 * HTTP error hierarchy.
 *
 * Throw these from service / repository / controller code. The centralized
 * error handler maps them to JSON responses with the appropriate status code.
 *
 * Design:
 *   - `AppError` is the base — any error that's a "known" business condition.
 *   - Subclasses set status + code + default message; you can override message + details at the call site.
 *   - `code` is a stable machine-readable string (clients can branch on it).
 *   - `details` is optional structured context (e.g. which field violated a constraint).
 *
 * Unknown errors (anything NOT an AppError) are treated as 500 by the
 * error handler — never expose their messages to clients in production.
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  /** When false, the error is logged but expected (e.g. 404, validation). */
  public readonly isOperational: boolean;

  constructor(
    statusCode: number,
    message: string,
    code = "INTERNAL_ERROR",
    details?: unknown,
    isOperational = true,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad request", details?: unknown) {
    super(400, message, "BAD_REQUEST", details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required", details?: unknown) {
    super(401, message, "UNAUTHORIZED", details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden", details?: unknown) {
    super(403, message, "FORBIDDEN", details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found", details?: unknown) {
    super(404, message, "NOT_FOUND", details);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict", details?: unknown) {
    super(409, message, "CONFLICT", details);
  }
}

export class UnprocessableEntityError extends AppError {
  constructor(message = "Unprocessable entity", details?: unknown) {
    super(422, message, "UNPROCESSABLE_ENTITY", details);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = "Too many requests", details?: unknown) {
    super(429, message, "TOO_MANY_REQUESTS", details);
  }
}

export class InternalServerError extends AppError {
  constructor(message = "Internal server error", details?: unknown) {
    super(500, message, "INTERNAL_ERROR", details, false);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = "Service unavailable", details?: unknown) {
    super(503, message, "SERVICE_UNAVAILABLE", details, false);
  }
}
