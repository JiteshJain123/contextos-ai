import { Router } from "express";
import { clerkWebhookHandler } from "../modules/auth/index.js";

const webhookRouter: Router = Router();

webhookRouter.post("/clerk", clerkWebhookHandler);

export { webhookRouter };
