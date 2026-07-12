import { Router } from "express";

import { v1Router } from "./v1/index.js";

/**
 * Top-level API router.
 *
 * When v2 ships, mount it side-by-side:
 *   apiRouter.use("/v2", v2Router);
 */
const apiRouter: Router = Router();

apiRouter.use("/v1", v1Router);

export { apiRouter };
