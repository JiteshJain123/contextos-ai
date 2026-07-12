import { prisma } from "@contextos-ai/database";
import { Router } from "express";

import { asyncHandler } from "../../lib/async-handler.js";
import { ok } from "../../lib/response.js";

const router: Router = Router();

/**
 * GET /api/v1/health
 *
 * Liveness probe — returns 200 as long as the Node process is responsive.
 * Load balancers and k8s liveness checks hit this. MUST NOT perform
 * I/O (no DB, no Redis) — a transient DB blip must not kill the process.
 */
router.get("/", (_req, res) => {
  res.json(
    ok({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
    }),
  );
});

/**
 * GET /api/v1/health/ready
 *
 * Readiness probe — returns 200 only when the process can serve real traffic.
 * Checks that the database connection is live and the connection pool can
 * issue queries. Returns 503 if any dependency is down so the load balancer
 * stops routing new requests here until the issue clears.
 */
router.get(
  "/ready",
  asyncHandler(async (_req, res) => {
    let dbStatus: "ok" | "error" = "ok";
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = "error";
    }

    const allOk = dbStatus === "ok";
    res.status(allOk ? 200 : 503).json(
      ok({
        status: allOk ? "ready" : "not_ready",
        checks: {
          database: dbStatus,
        },
      }),
    );
  }),
);

export { router as healthRouter };
