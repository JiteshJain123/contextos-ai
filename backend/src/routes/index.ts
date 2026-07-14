import { Router } from "express";

import { v1Router } from "./v1/index.js";
import { webhookRouter } from "./webhooks.js";

const apiRouter: Router = Router();

apiRouter.use("/v1", v1Router);
apiRouter.use("/webhooks", webhookRouter);

export { apiRouter };
