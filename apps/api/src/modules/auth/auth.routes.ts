import { Router } from "express";

import { authRateLimiter } from "../../config/rate-limit.js";
import {
  loginController,
  logoutController,
  meController,
  refreshController,
  signupController,
} from "./auth.controller.js";
import { requireAuth } from "./auth.middleware.js";

/**
 * Auth router — mounted at /api/v1/auth.
 *
 * /login and /signup sit behind a stricter per-IP rate limiter (10 req /
 * 15 min) on top of the global 100 req / 15 min limiter, to resist
 * credential-stuffing and brute-force attacks.
 */
const router: Router = Router();

router.post("/signup", authRateLimiter, signupController);
router.post("/login", authRateLimiter, loginController);
router.post("/logout", logoutController);
router.post("/refresh", refreshController);
router.get("/me", requireAuth, meController);

export { router as authRouter };
