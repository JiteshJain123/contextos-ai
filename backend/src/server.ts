import { createServer, type Server } from "node:http";

import { prisma } from "@/database";
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

// How long to wait before retrying after EADDRINUSE (ms).
// node --watch kills the old process and immediately spawns the new one;
// the OS needs ~500ms to fully release the TCP socket.
const BIND_RETRY_DELAY_MS = 600;
const BIND_MAX_RETRIES = 5;

export function startServer(app: Express): Promise<Server> {
  return new Promise((resolve, reject) => {
    httpServer = createServer(app);

    let attempts = 0;

    const tryListen = () => {
      httpServer!.listen(env.PORT, env.HOST, () => {
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

      httpServer!.once("error", (err: NodeJS.ErrnoException) => {
        if (err.code === "EADDRINUSE" && attempts < BIND_MAX_RETRIES) {
          attempts++;
          logger.warn(
            { port: env.PORT, attempt: attempts },
            `Port in use — retrying in ${BIND_RETRY_DELAY_MS}ms`,
          );
          // Unbind the failed server before retrying so the handle is clean.
          httpServer!.close(() => setTimeout(tryListen, BIND_RETRY_DELAY_MS));
        } else {
          reject(err);
        }
      });
    };

    tryListen();
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

  // Programming bugs — log loudly. In production the process state is
  // considered corrupt, so we exit and let the orchestrator restart a clean
  // instance. In development we log but stay alive: exiting on a single bad
  // request would tear down the `pnpm dev` run (and the frontend with it),
  // making one stray rejection look like a total outage.
  const isProd = env.NODE_ENV === "production";

  process.on("uncaughtException", (err) => {
    logger.fatal({ err }, "uncaught exception");
    if (isProd) process.exit(1);
  });
  process.on("unhandledRejection", (reason) => {
    logger.fatal({ reason }, "unhandled rejection");
    if (isProd) process.exit(1);
  });
}
