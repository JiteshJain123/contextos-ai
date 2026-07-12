# @contextos-ai/api

Express 5 + TypeScript backend. Foundation only — domain modules (auth, user, project, task) are added in later phases.

## Quickstart

```bash
# 1. Copy env template and fill in DATABASE_URL + JWT_SECRET
cp .env.example .env

# 2. From repo root
pnpm --filter @contextos-ai/api dev

# Or from this folder
pnpm dev
```

Server boots on `http://localhost:4000` by default.

Try it:

```bash
curl http://localhost:4000/api/v1/health
# → {"data":{"status":"ok","timestamp":"...","uptime":0.12}}
```

## Architecture

```
src/
├── index.ts            bootstrap (env → app → listen → shutdown handlers)
├── env.ts              typed env via @contextos-ai/config/server
├── app.ts              createApp() — pure function building Express; testable
├── server.ts           startServer() + attachShutdownHandlers()
├── config/             middleware option objects (cors, helmet, rate-limit)
├── middleware/         request-context, error-handler, not-found
├── lib/                logger, http-errors, async-handler, response helpers
├── routes/             URL → router mounting; versioned at /api/v1
├── modules/            domain modules (empty — added in later phases)
└── types/              Express type augmentation
```

### Three entry files — why

- **`app.ts`** is a pure function. It builds the Express app but doesn't bind to a port. Integration tests import `createApp()` and use supertest against it.
- **`server.ts`** wraps the app in an HTTP server, attaches signal handlers, and handles graceful shutdown.
- **`index.ts`** is the production bootstrap. Loads env, calls `createApp()`, calls `startServer()`.

### Middleware order (canonical)

```
1.  trust proxy             req.ip + secure cookies behind nginx / Cloudflare
2.  disable x-powered-by    don't advertise the server
3.  helmet                  security headers
4.  cors                    preflight + origin allowlist
5.  request-context         UUID request id + per-request child logger
6.  compression             gzip/brotli responses
7.  cookie-parser           parse Cookie header
8.  express.json/urlencoded body parsers
9.  rate limiter            global per-IP rate limit
10. routes                  /api/v1/...
11. 404 fallback            forwards NotFoundError
12. error handler           formats every error into JSON
```

## Error handling contract

Every error response is shaped:

```json
{
  "error": {
    "code": "STRING_CODE",
    "message": "human-readable message",
    "details": { ... optional ... },
    "errors": { "fieldPath": ["error msg"] },
    "requestId": "uuid-for-support-correlation"
  }
}
```

Throw one of these from anywhere — the error handler does the rest:

```ts
import { BadRequestError, NotFoundError, ConflictError } from "../lib/http-errors";

if (!user) throw new NotFoundError("User not found");
if (exists) throw new ConflictError("Email already registered");
```

For validation errors, `parseInput()` from `@contextos-ai/validators/parse` throws `ValidationError` — the error handler maps it to a 400 with flattened field errors.

## Response helpers

```ts
import { ok, created, paginated } from "../lib/response";

res.json(ok(user)); // { data: user }
res.status(201).json(created(newProject)); // { data: newProject }
res.json(paginated(tasks, { page, pageSize, total })); // { data, meta: {...} }
```

## Adding a domain module

1. Create `src/modules/<domain>/`:
   ```
   modules/auth/
   ├── auth.controller.ts        HTTP layer: extracts inputs, returns responses
   ├── auth.service.ts           business logic (transactional, side-effect-aware)
   ├── auth.repository.ts        DB access via @contextos-ai/database
   └── auth.routes.ts            express.Router with endpoints
   ```
2. Validate inputs with schemas from `@contextos-ai/validators/<domain>`:

   ```ts
   import { loginSchema } from "@contextos-ai/validators/auth";
   import { parseInput } from "@contextos-ai/validators/parse";

   const input = parseInput(loginSchema, req.body);
   ```

3. Mount the router in `src/routes/v1/index.ts`:
   ```ts
   import { authRouter } from "../../modules/auth/auth.routes.js";
   v1Router.use("/auth", authRouter);
   ```

## Scripts

| Script                   | Description                                                     |
| ------------------------ | --------------------------------------------------------------- |
| `pnpm dev`               | tsx watch + native `--env-file-if-exists` for .env / .env.local |
| `pnpm build`             | tsup bundle → `dist/index.js` (esbuild-based, ~100ms)           |
| `pnpm start`             | run the bundled artifact                                        |
| `pnpm type-check`        | tsc --noEmit                                                    |
| `pnpm lint` / `lint:fix` | ESLint flat config (from @contextos-ai/eslint-config/node)      |
| `pnpm clean`             | rimraf dist + .turbo                                            |

## Environment

See `.env.example`. Required for boot: `DATABASE_URL`, `JWT_SECRET` (≥32 chars). All env validation lives in `@contextos-ai/config/server` — adding a var means updating that schema once, not every consumer.

## Graceful shutdown

On SIGTERM/SIGINT:

1. Stop accepting new connections (`server.close()`)
2. Wait for in-flight requests (up to 30s)
3. Disconnect DB/Redis (when wired)
4. Flush logs
5. `process.exit(0)`

Force-exit timer ensures shutdown never hangs forever.

## Logging

JSON-structured pino logs in production; pretty-printed in development via `pino-pretty`. Every request gets a `req.log` child logger with `reqId` already bound, and the request id is echoed back to clients as `X-Request-Id` for support correlation.

Sensitive fields are auto-redacted from logs (see `lib/logger.ts` — passwords, tokens, secrets).
