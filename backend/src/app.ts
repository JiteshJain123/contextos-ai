import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { clerkMiddleware } from "@clerk/express";

import { corsOptions } from "./config/cors.js";
import { env } from "./env.js";
import { helmetOptions } from "./config/helmet.js";
import { globalRateLimiter } from "./config/rate-limit.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/not-found.js";
import { requestContext } from "./middleware/request-context.js";
import { apiRouter } from "./routes/index.js";

/**
 * Build the Express application.
 *
 * Pure function — no port binding, no signal handlers. The HTTP server is
 * created separately in `server.ts`. Integration tests can call this and
 * use supertest against the returned app.
 *
 * Middleware order matters. The chain below is the canonical pattern:
 *
 *   1. trust proxy        ensure req.ip + secure cookies work behind a proxy
 *   2. disable x-powered-by  don't advertise the server
 *   3. helmet              security headers FIRST so they're always set
 *   4. cors                preflight + origin handling
 *   5. request-context     UUID id + per-request child logger (early so it shows in logs)
 *   6. compression         gzip/brotli responses
 *   7. cookie-parser       parse Cookie header
 *   8. express.json/urlencoded  body parsers
 *   9. rate limiter        global per-IP rate limit
 *  10. routes              /api/v1/...
 *  11. 404 fallback        wraps unknown routes in NotFoundError
 *  12. error handler       last in chain — formats every error into JSON
 */
export function createApp(): Express {
  const app = express();

  // Trust the first proxy hop (nginx / Cloudflare / load balancer).
  // Required for `req.ip`, `secure` cookies, and rate-limit IP detection.
  app.set("trust proxy", 1);

  // Don't advertise Express in the X-Powered-By header.
  app.disable("x-powered-by");

  // -------- Security & traffic shaping --------
  app.use(helmet(helmetOptions));
  app.use(cors(corsOptions));
  app.use(requestContext);
  app.use(compression());
  app.use(cookieParser());

  // -------- Clerk auth --------
  // Must run before any route that calls getAuth(req) / requireAuth.
  app.use(clerkMiddleware());

  // -------- Body parsers --------
  // Webhook route needs the raw body for svix signature verification — mount
  // express.raw() for that path BEFORE the global json parser takes over.
  app.use("/api/webhooks", express.raw({ type: "application/json" }));
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  // -------- Rate limiting --------
  // Applied globally in production only. In development everything comes from
  // localhost (one IP), so the per-IP limit throttles normal dev usage.
  if (env.NODE_ENV === "production") {
    app.use(globalRateLimiter);
  }

  // -------- Routes --------
  app.use("/api", apiRouter);

  // -------- 404 + error handler (must come last, in this order) --------
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
