import { createServer, type Server } from "node:http";

import { prisma } from "@contextos-ai/database";
import type { Express } from "express";

import { env } from "./env.js";
import { logger } from "./lib/logger.js";

/**
 * HTTP server lifecycle: start + graceful shutdown.
 *
 * Graceful shutdown is critical for production:
 *
 *   K8s sends SIGTERM ──► server.close()           (stop accepting new connections)
 *                    ──► wait for in-flight req    (~30s grace period)
 *                    ──► disconnect Prisma / Redis (when wired)
 *                    ──► flush logs
 *                    ──► process.exit(0)
 *
 * Without this, in-flight requests get TCP-reset during deploys and users
 * see "ERR_CONNECTION_RESET" errors.
 */

const SHUTDOWN_TIMEOUT_MS = 30_000;

let httpServer: Server | undefined;
let isShuttingDown = false;

export function startServer(app: Express): Promise<Server> {
  return new Promise((resolve, reject) => {
    httpServer = createServer(app);
    httpServer.listen(env.PORT, env.HOST, () => {
      logger.info(
        { port: env.PORT, host: env.HOST, env: env.NODE_ENV },
        `API listening on http://${env.HOST}:${env.PORT}`,
      );
      if (env.NODE_ENV === "production" && !env.REDIS_URL) {
        logger.warn(
          "REDIS_URL is not set — rate limiters use in-memory storage and will not enforce limits across multiple API instances",
        );
      }
      resolve(httpServer!);
    });
    httpServer.on("error", reject);
  });
}

async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ signal }, "graceful shutdown initiated");

  // Force-exit guard: never let shutdown hang forever.
  const forceExitTimer = setTimeout(() => {
    logger.fatal({ signal }, "graceful shutdown timed out — forcing exit");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExitTimer.unref();

  try {
    // 1. Stop accepting new connections; wait for in-flight requests.
    if (httpServer) {
      await new Promise<void>((resolve, reject) => {
        httpServer!.close((err) => (err ? reject(err) : resolve()));
      });
      logger.info("http server closed");
    }

    // 2. Close the Prisma connection pool.
    await prisma.$disconnect();
    logger.info("prisma disconnected");

    // 3. Flush pino's async write buffer.
    logger.flush?.();

    clearTimeout(forceExitTimer);
    process.exit(0);
  } catch (err) {
    logger.fatal({ err }, "shutdown failed");
    process.exit(1);
  }
}

/**
 * Attach process-level signal + crash handlers.
 *
 * Idempotent — safe to call once at boot.
 */
export function attachShutdownHandlers(): void {
  process.on("SIGTERM", () => {
    void gracefulShutdown("SIGTERM");
  });
  process.on("SIGINT", () => {
    void gracefulShutdown("SIGINT");
  });

  // Programming bugs — log loudly and exit. Don't try to recover; whatever
  // state we're in is corrupt by definition.
  process.on("uncaughtException", (err) => {
    logger.fatal({ err }, "uncaught exception — exiting");
    process.exit(1);
  });
  process.on("unhandledRejection", (reason) => {
    logger.fatal({ reason }, "unhandled rejection — exiting");
    process.exit(1);
  });
}
