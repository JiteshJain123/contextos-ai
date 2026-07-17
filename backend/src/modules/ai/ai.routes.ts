import { Router } from "express";

import { aiRateLimiter } from "../../config/rate-limit.js";
import { requireAuth } from "../auth/index.js";
import {
  breakdownTasksController,
  createConversationController,
  deleteConversationController,
  executeActionController,
  listConversationsController,
  listMessagesController,
  streamChatController,
  suggestTasksController,
} from "./ai.controller.js";

/**
 * AI routers — two shapes mirroring the task module pattern.
 *
 *   aiNestedRouter (mounted at /projects/:projectId/conversations)
 *     GET   /         list conversations for the project
 *     POST  /         create a new conversation
 *
 *   aiRouter (mounted at /conversations)
 *     DELETE /:conversationId             soft-delete
 *     GET    /:conversationId/messages    list messages
 *     POST   /:conversationId/messages    stream chat (SSE)
 *
 * `mergeParams: true` on the nested router lets child handlers read
 * req.params.projectId from the parent mount point.
 */

export const aiNestedRouter: Router = Router({ mergeParams: true });
aiNestedRouter.use(requireAuth);
aiNestedRouter.get("/", listConversationsController);
aiNestedRouter.post("/", createConversationController);

// POST /projects/:projectId/conversations/suggest-tasks — AI task generation (non-streaming)
aiNestedRouter.post("/suggest-tasks", aiRateLimiter, suggestTasksController);
// POST /projects/:projectId/conversations/breakdown-tasks — SSE streaming task breakdown
aiNestedRouter.post("/breakdown-tasks", aiRateLimiter, breakdownTasksController);

export const aiRouter: Router = Router();
aiRouter.use(requireAuth);
aiRouter.delete("/:conversationId", deleteConversationController);
aiRouter.get("/:conversationId/messages", listMessagesController);
aiRouter.post("/:conversationId/messages", aiRateLimiter, streamChatController);
aiRouter.post("/:conversationId/execute-action", aiRateLimiter, executeActionController);
