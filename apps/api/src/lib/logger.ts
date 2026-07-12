import { pino, stdSerializers } from "pino";

/**
 * Singleton structured logger.
 *
 * Why pino:
 *   - Lowest-overhead Node logger (~150K logs/sec); near-zero impact on hot paths.
 *   - JSON-structured output by default — ingestible by Datadog / Loki / CloudWatch.
 *   - Async-safe: writes don't block the event loop.
 *
 * Logger config reads `process.env` directly (NOT our typed env) because the
 * logger is initialized before env validation runs. If env validation fails,
 * we still need a logger to report the failure.
 */
const isDev = process.env.NODE_ENV !== "production";
const logLevel = process.env.LOG_LEVEL ?? "info";

export const logger = pino({
  level: logLevel,
  // Pretty-print in dev for human readability; raw JSON in prod for ingestion.
  ...(isDev && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss.l",
        ignore: "pid,hostname",
      },
    },
  }),
  // Redact common secret fields so they never leak into logs even if logged
  // by accident. Add fields as the schema grows.
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.body.password",
      "req.body.currentPassword",
      "req.body.newPassword",
      "req.body.confirmPassword",
      "req.body.token",
      "*.password",
      "*.passwordHash",
      "*.jwtSecret",
    ],
    censor: "[REDACTED]",
  },
  // Surface error stack traces under `err` key in JSON.
  serializers: {
    err: stdSerializers.err,
  },
});
