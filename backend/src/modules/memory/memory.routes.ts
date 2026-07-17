/**
 * memory.routes.ts
 *
 * Routes: /projects/:projectId/memory
 *
 * All routes require authentication (requireAuth applied in v1 router).
 * AI-intensive routes (rebuild, search) have the shared aiRateLimiter applied.
 */

import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware.js";
import { aiRateLimiter } from "../../config/rate-limit.js";
import { createMemoryController } from "./memory.controller.js";
import { createMemoryService } from "./memory.service.js";
import { env } from "../../env.js";

const memoryService = createMemoryService(env.GEMINI_API_KEY ?? "");
const memoryController = createMemoryController(memoryService);

const memoryNestedRouter: Router = Router({ mergeParams: true });

// GET /projects/:projectId/memory
memoryNestedRouter.get("/", requireAuth, memoryController.getMemory);

// POST /projects/:projectId/memory/rebuild  (SSE — rate-limited)
memoryNestedRouter.post("/rebuild", requireAuth, aiRateLimiter, memoryController.rebuildMemory);

// DELETE /projects/:projectId/memory
memoryNestedRouter.delete("/", requireAuth, memoryController.clearMemory);

// GET /projects/:projectId/memory/rag?query=...
memoryNestedRouter.get("/rag", requireAuth, memoryController.getRAGContext);

export { memoryNestedRouter, memoryService };
