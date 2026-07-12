import { randomUUID } from "node:crypto";

import { pinoHttp } from "pino-http";

import { logger } from "../lib/logger.js";

/**
 * Per-request context middleware.
 *
 * Does three things in one pass:
 *   1. Assigns / propagates an `X-Request-Id` header. Incoming id is trusted
 *      (allows correlation across services); otherwise a UUID is generated.
 *   2. Logs every request + response automatically with the request id bound.
 *   3. Attaches a child logger (`req.log`) so controllers can log with the
 *      request id already in scope: `req.log.info({ userId }, "did thing")`.
 *
 * The id is exposed on the response as `X-Request-Id` so clients can paste
 * it into bug reports — the support team then greps logs.
 */
export const requestContext = pinoHttp({
  logger,
  // Use UUIDs unless a propagated id is present (e.g. through API gateway).
  genReqId: (req, res) => {
    const incoming = req.headers["x-request-id"];
    const id = typeof incoming === "string" && incoming.length > 0 ? incoming : randomUUID();
    res.setHeader("X-Request-Id", id);
    return id;
  },
  // Quiet for boring 2xx responses; let the error handler log failures.
  customLogLevel: (_req, res, err) => {
    if (err) return "error";
    if (res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  // Skip noisy health checks from request logs (still go through middleware).
  autoLogging: {
    ignore: (req) => req.url === "/api/v1/health" || req.url === "/api/v1/health/ready",
  },
});
