import { createApp } from "./app.js";
import { logger } from "./lib/logger.js";
import { attachShutdownHandlers, startServer } from "./server.js";

/**
 * API bootstrap.
 *
 * Order matters:
 *   1. createApp()              build the Express app (no listen)
 *   2. startServer(app)         bind to PORT (validates env transitively)
 *   3. attachShutdownHandlers() arm signal + crash handlers
 *
 * If env validation in env.ts throws, this fails before listen — exactly
 * the fail-fast behavior we want.
 */
async function main(): Promise<void> {
  try {
    const app = createApp();
    await startServer(app);
    attachShutdownHandlers();
  } catch (err) {
    logger.fatal({ err }, "API failed to start");
    process.exit(1);
  }
}

void main();
