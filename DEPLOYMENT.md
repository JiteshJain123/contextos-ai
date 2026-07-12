# contextos-ai — Production Deployment Guide

> **Stack**: Turborepo monorepo · Express 5 API · Next.js 16 App Router · PostgreSQL (Prisma 7) · Gemini AI streaming

---

## 1. Deployment Checklist

Run through this before every production deployment.

### Secrets & Environment
- [ ] `JWT_SECRET` is at least 32 chars, generated with a CSPRNG (not a human password)
- [ ] `DATABASE_URL` uses `?sslmode=require` on managed PostgreSQL
- [ ] `GEMINI_API_KEY` is set (AI features return 503 without it)
- [ ] `CORS_ORIGIN` is set to the exact frontend URL (no trailing slash)
- [ ] No `.env` files with real secrets are committed to the repo

### Database
- [ ] Migrations are applied before the new API version starts (`prisma migrate deploy`)
- [ ] `migration_lock.toml` provider is `postgresql` (not `sqlite`)
- [ ] Database has connection pool limits configured (Neon: 10, Supabase pooler: 15)
- [ ] Database SSL is enabled

### API
- [ ] `NODE_ENV=production` is set
- [ ] `GET /api/v1/health/ready` returns 200 after deployment
- [ ] `pino-pretty` is in devDependencies only (not installed in prod) ✓
- [ ] `@node-rs/argon2` native binary is compatible with the deployment OS (Linux x64 on Railway/Render) ✓
- [ ] Rate limiters are active (global 100/15min, auth 10/15min, AI 50/hr) ✓
- [ ] Graceful shutdown on SIGTERM closes in-flight requests before exit ✓

### Frontend
- [ ] `NEXT_PUBLIC_API_URL` matches the production API URL
- [ ] `NEXT_PUBLIC_APP_URL` matches the production frontend URL (for OG metadata)
- [ ] Build completes without TypeScript errors
- [ ] React Query Devtools are not visible (guarded by `NODE_ENV=development`) ✓
- [ ] Security headers are applied (verified with https://securityheaders.com)

### Post-Deploy Smoke Tests
- [ ] `GET /api/v1/health` → `{ status: "ok" }`
- [ ] `GET /api/v1/health/ready` → `{ status: "ready", checks: { database: "ok" } }`
- [ ] Sign up a new user → receives JWT cookies
- [ ] Create a project → appears in the list
- [ ] Send an AI message → stream response arrives in the browser
- [ ] Log out → cookies are cleared, protected routes redirect to /login

---

## 2. Required Environment Variables

### API (`apps/api`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | Set to `production` |
| `DATABASE_URL` | Yes | `postgresql://...?sslmode=require` |
| `JWT_SECRET` | Yes | 48+ char random string |
| `CORS_ORIGIN` | Yes | Frontend URL (e.g. `https://app.example.com`) |
| `GEMINI_API_KEY` | For AI | Google AI Studio key |
| `PORT` | No | Default `4000` |
| `HOST` | No | Default `0.0.0.0` |
| `LOG_LEVEL` | No | Default `info` |
| `ACCESS_TOKEN_EXPIRES_IN` | No | Default `15m` |
| `REFRESH_TOKEN_EXPIRES_IN` | No | Default `30d` |
| `COOKIE_DOMAIN` | No | Only for subdomain sharing |
| `REDIS_URL` | No | Required for multi-replica rate limiting |

### Web (`apps/web`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | `https://api.example.com` |
| `NEXT_PUBLIC_APP_URL` | Yes | `https://app.example.com` |
| `NEXT_PUBLIC_APP_NAME` | No | Default `contextos-ai` |
| `DATABASE_URL` | No | Only needed for direct server-side DB access |
| `NEXT_OUTPUT` | No | Set to `standalone` for Docker/Railway/Render |

### Generating secrets

```bash
# JWT_SECRET (48 bytes → 64 char base64url string)
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

# Or with OpenSSL:
openssl rand -base64 48
```

---

## 3. Frontend Deployment (Vercel)

Vercel is the recommended frontend host. It integrates natively with the Next.js App Router.

### One-time setup

1. Import the repository into Vercel.
2. Set **Root Directory** to `apps/web`.
3. Set **Framework Preset** to `Next.js`.
4. Add environment variables (Project → Settings → Environment Variables):

```
NEXT_PUBLIC_APP_NAME=contextos-ai
NEXT_PUBLIC_APP_URL=https://<your-vercel-domain>
NEXT_PUBLIC_API_URL=https://<your-api-domain>
```

5. Deploy.

### Turbo build command (optional, for faster CI)

In Vercel project settings, set the **Build Command** to:

```bash
cd ../.. && pnpm turbo build --filter=@contextos-ai/web...
```

This uses Turborepo's remote cache and only rebuilds changed packages.

### Notes

- Do **not** set `NEXT_OUTPUT=standalone` on Vercel — Vercel manages the output format natively.
- The `output: "standalone"` option in `next.config.ts` is only activated when `NEXT_OUTPUT=standalone` is set.
- Vercel automatically injects `VERCEL_URL` — you can use this as `NEXT_PUBLIC_APP_URL` in preview deployments.
- Edge Middleware (`middleware.ts`) runs on Vercel's edge network automatically.

---

## 4. Backend Deployment (Railway or Render)

### Railway

1. Create a new Railway project.
2. Add a **GitHub** service pointing to this repo.
3. Set **Root Directory** to `apps/api`.
4. Set the **Start Command**:
   ```bash
   node dist/index.js
   ```
5. Set the **Build Command**:
   ```bash
   cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @contextos-ai/api build
   ```
6. Add environment variables (see Section 2).
7. Add a **PostgreSQL** plugin — Railway auto-injects `DATABASE_URL`.
8. Deploy.

Railway auto-detects `SIGTERM` and your graceful shutdown handler fires correctly.

### Render

1. Create a new **Web Service**.
2. Connect your GitHub repo.
3. Set **Root Directory** to `apps/api`.
4. Set **Build Command**:
   ```bash
   npm install -g pnpm && cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @contextos-ai/api build
   ```
5. Set **Start Command**:
   ```bash
   node dist/index.js
   ```
6. Set **Environment** to `Node`.
7. Add environment variables.
8. Add a PostgreSQL database from Render's dashboard and copy the connection string.

### Docker (alternative)

```dockerfile
# apps/api/Dockerfile
FROM node:22-alpine AS base
RUN npm install -g pnpm
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/ ./packages/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter @contextos-ai/api build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Copy only what the API needs at runtime
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/package.json ./package.json
EXPOSE 4000
CMD ["node", "dist/index.js"]
```

---

## 5. Database Deployment

### Provider recommendations

| Provider | Free tier | Connection pooling | Notes |
|----------|-----------|-------------------|-------|
| **Neon** | 0.5 GB | Built-in via pgbouncer | Best for serverless/edge |
| **Supabase** | 500 MB | Built-in (Transaction mode) | Includes dashboard UI |
| **Railway PostgreSQL** | Included with Railway | Needs PgBouncer separately | Simplest if using Railway API |
| **AWS RDS** | 12 months free tier | RDS Proxy | Production-grade, higher ops cost |

### Running migrations in production

**Never run `prisma migrate dev` in production.** Use the deploy command:

```bash
# From the database package directory
pnpm --filter @contextos-ai/database migrate:deploy

# Or directly:
cd packages/database && npx prisma migrate deploy
```

`prisma migrate deploy` only applies pending migrations. It never generates new ones and never resets data.

### Migration strategy for zero-downtime deploys

This schema uses only additive migrations (new tables, new optional columns, new indexes). All changes are backward-compatible:

1. Deploy the new migration **before** deploying the new API version.
2. The old API version continues to run while the migration applies.
3. Deploy the new API version.

If a migration adds a NOT NULL column without a default, it requires a two-step process (add nullable → backfill → add constraint). The current schema has no such columns.

### Connection pool settings

Configure the pool to match your provider's limits:

```
# In DATABASE_URL for PgBouncer (Supabase/Neon)
?pgbouncer=true&connection_limit=5

# Or via Prisma config (packages/database/prisma.config.ts)
```

---

## 6. Scaling Recommendations

### Current bottlenecks

| Component | Bottleneck | Mitigation |
|-----------|-----------|-----------|
| Rate limiter | In-memory (per-process) | Add Redis store (`@express-rate-limit/redis-store`) |
| Session storage | PostgreSQL `sessions` table | Fine for < 100k users; add index maintenance |
| AI streaming | Gemini API latency (~1s first token) | No mitigation — upstream |
| Task position conflicts | Float precision at ~50+ reorders | Rebalance positions when gap < 0.001 |

### Horizontal API scaling

The API is **stateless** (no in-memory session state, all auth is JWT + DB-backed). You can run multiple replicas:

1. Put a load balancer in front (Railway's built-in / Render's / nginx).
2. Set `app.set("trust proxy", 1)` is already done ✓
3. **Replace the rate limiters** with Redis-backed ones before scaling:

```bash
pnpm --filter @contextos-ai/api add @express-rate-limit/redis-store ioredis
```

```ts
// In apps/api/src/config/rate-limit.ts
import { RedisStore } from "@express-rate-limit/redis-store";
import { Redis } from "ioredis";

const redis = new Redis(env.REDIS_URL!);
const baseOptions = {
  standardHeaders: "draft-7",
  legacyHeaders: false,
  store: new RedisStore({ client: redis }),
};
```

### Frontend scaling

Vercel scales automatically. No action needed.

### Database scaling

1. **Read replicas**: Route read-heavy queries (task lists, message history) to a read replica via separate `DATABASE_REPLICA_URL`.
2. **Connection pooling**: Add PgBouncer or use Neon's built-in pooler — critical at > 50 concurrent API instances.
3. **Soft-delete maintenance**: Add a scheduled job to hard-delete rows where `deletedAt < NOW() - INTERVAL '90 days'` to prevent unbounded table growth.

---

## 7. Production Architecture

```
                    ┌─────────────────────────────────────┐
                    │           User's Browser             │
                    └──────────────┬──────────────────────┘
                                   │ HTTPS
                    ┌──────────────▼──────────────────────┐
                    │         Vercel Edge Network          │
                    │  (Edge Middleware: cookie-presence   │
                    │   check, redirect guard, CDN cache)  │
                    └──────────────┬──────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────┐
                    │       Next.js App Router             │
                    │  ┌────────────────────────────────┐ │
                    │  │ Server Components (RSC)        │ │
                    │  │  - Dashboard layout auth check │ │
                    │  │  - Server fetches via cookies  │ │
                    │  └────────────────────────────────┘ │
                    │  ┌────────────────────────────────┐ │
                    │  │ Client Components              │ │
                    │  │  - TanStack Query (30s stale)  │ │
                    │  │  - SSE consumer (AI streaming) │ │
                    │  │  - Silent token refresh        │ │
                    │  └────────────────────────────────┘ │
                    └──────────────┬──────────────────────┘
                                   │ HTTPS + HttpOnly cookies
                    ┌──────────────▼──────────────────────┐
                    │     Express 5 API (Railway)          │
                    │                                      │
                    │  Middleware chain:                   │
                    │  trust proxy → helmet → cors →       │
                    │  request-context → compression →     │
                    │  cookie-parser → body-parser →       │
                    │  rate-limit → routes                 │
                    │                                      │
                    │  Auth:    JWT HS256 (15m) +          │
                    │           opaque refresh (30d)       │
                    │  AI:      SSE AsyncGenerator →       │
                    │           Gemini 3.1 Flash Lite      │
                    │  Errors:  centralized handler,       │
                    │           no stack traces in prod    │
                    └──────┬────────────────┬─────────────┘
                           │                │
             ┌─────────────▼──┐     ┌───────▼───────────┐
             │  PostgreSQL     │     │   Gemini API       │
             │  (Neon/Railway) │     │   (Google Cloud)   │
             │                 │     │                    │
             │  Prisma 7       │     │  gemini-3.1-flash  │
             │  Soft deletes   │     │  -lite / streaming │
             │  4 migrations   │     └────────────────────┘
             └─────────────────┘

Security layers:
  ├── HTTPS everywhere (TLS terminated at edge/load balancer)
  ├── HttpOnly + Secure + SameSite=Lax cookies
  ├── JWT with DB-verified user existence on every request
  ├── Argon2id password hashing
  ├── Helmet security headers (API) + custom headers (Web)
  ├── Rate limiting: global + auth + AI endpoints
  ├── CORS allowlist (explicit origins only)
  ├── Soft deletes (no data loss from accidental deletes)
  └── Pino secret redaction (passwords/tokens never logged)
```

### Request lifecycle (authenticated page load)

1. Browser hits Vercel edge → Middleware checks `ctx_access` cookie presence.
2. If no cookie → redirect to `/login?redirect=...`.
3. If cookie present → RSC renders, `DashboardLayout` calls `/api/v1/auth/me` server-side with forwarded cookies.
4. If `/auth/me` returns 401 → `redirect("/login")`.
5. Page renders with user data from the server.
6. Client Components mount and use TanStack Query for data fetching.
7. On 401 from any client fetch → silent `POST /auth/refresh` → retry → new cookies.
8. On refresh failure → `window.location.href = "/login?redirect=..."`.

### AI streaming lifecycle

1. Client POSTs to `/conversations/:id/messages`.
2. API validates ownership, peeks first generator value (DB check before SSE starts).
3. SSE headers committed → `text/event-stream`.
4. Gemini chunks arrive → forwarded as `{ type: "chunk", content: "..." }` SSE events.
5. On generator completion → AI message persisted → `{ type: "done" }` event.
6. Client receives `done` → invalidates TanStack Query cache → message list refetches.
7. On client disconnect mid-stream → generator continues to persist the full response to DB.

---

## 8. CORS Configuration

### How CORS works in this app

The API uses the `cors` npm package applied globally in `apps/api/src/server.ts`. It reads `CORS_ORIGIN` at boot and splits on commas to build an origin allowlist.

```
Browser                API
  │──── preflight OPTIONS ───▶│  cors middleware checks Origin header
  │◀── 200 + Access-Control ──│  against CORS_ORIGIN allowlist
  │──── actual request ───────▶│
  │◀── response ───────────────│
```

### Setting CORS_ORIGIN

```bash
# Single origin (most common)
CORS_ORIGIN=https://app.example.com

# Multiple origins — staging + production
CORS_ORIGIN=https://app.example.com,https://staging.example.com

# Local dev — leave unset; the API defaults to permissive (any origin)
```

**Rules that must be followed:**
1. **Exact protocol match** — `https://` and `http://` are different origins
2. **No trailing slash** — `https://app.example.com/` will NOT match `https://app.example.com`
3. **No wildcards** — `https://*.example.com` is not supported
4. **Port must match** — `https://app.example.com:3000` is a different origin from `https://app.example.com`

### CORS and cookies

This app uses `HttpOnly` cookies (`ctx_access`, `ctx_refresh`). For cookies to be sent cross-origin:

- The API sets `credentials: true` in the CORS config ✓
- The frontend sends `credentials: "include"` in every fetch ✓
- `CORS_ORIGIN` must be an exact origin — wildcards prevent credentialed requests ✓

### When API and web share a root domain

If both are on `*.example.com`:

```bash
# API env
CORS_ORIGIN=https://app.example.com
COOKIE_DOMAIN=.example.com    # dot prefix = share across subdomains

# This allows api.example.com to set cookies readable by app.example.com
```

### Debugging CORS errors

```bash
# Test preflight from the terminal
curl -X OPTIONS https://api.example.com/api/v1/health \
  -H "Origin: https://app.example.com" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Expected response headers:
# Access-Control-Allow-Origin: https://app.example.com
# Access-Control-Allow-Credentials: true
# Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE
```

---

## 9. Rate Limiting

Three rate limiters are active in production (source: `apps/api/src/config/rate-limit.ts`):

| Limiter | Window | Max requests | Applied to |
|---------|--------|-------------|-----------|
| Global | 15 min | 100 / IP | Every route |
| Auth | 15 min | 10 / IP | `POST /auth/login`, `POST /auth/signup` |
| AI | 1 hour | 50 / IP | `POST /conversations/:id/messages` |

Response on limit exceeded:

```json
HTTP 429 Too Many Requests
RateLimit-Limit: 10
RateLimit-Remaining: 0
RateLimit-Reset: 1716489600

{ "error": { "code": "TOO_MANY_REQUESTS", "message": "Too many attempts…" } }
```

### Adjusting limits

Edit `apps/api/src/config/rate-limit.ts` and change `limit` and `windowMs`:

```ts
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  limit: 10,                   // ← change this
  ...
});
```

Rebuild and redeploy after changing.

### Upgrading to Redis-backed rate limiting (required for multiple API replicas)

The current in-memory store is **per-process** — if you run 3 API replicas, each has its own counter, allowing 3× the configured limit. Switch to Redis before scaling horizontally:

```bash
pnpm --filter @contextos-ai/api add @express-rate-limit/redis-store ioredis
```

```ts
// apps/api/src/config/rate-limit.ts
import { RedisStore } from "@express-rate-limit/redis-store";
import { Redis } from "ioredis";

const redis = new Redis(env.REDIS_URL!);
const baseOptions = {
  standardHeaders: "draft-7",
  legacyHeaders: false,
  store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),
};
```

Set `REDIS_URL` in your deployment environment (Railway offers Redis as a plugin).

---

## 10. Security Hardening

### Already applied

The following is implemented and active in production:

| Layer | What's done |
|-------|------------|
| Passwords | Argon2id hashing via `@node-rs/argon2` |
| Auth tokens | JWT HS256 (15m) + opaque refresh tokens (30d), rotated on every refresh |
| Session revocation | `requireAuth` middleware hits DB on every request — deleted users are rejected immediately |
| Cookies | `HttpOnly`, `Secure` (prod), `SameSite=Lax` — inaccessible to JavaScript |
| API headers | Helmet middleware: `X-DNS-Prefetch-Control`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection` |
| Web headers | `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS (prod) |
| Rate limiting | Global + auth + AI limiters (see Section 9) |
| CORS | Exact-origin allowlist, credentials enabled |
| Error responses | Stack traces never sent in `NODE_ENV=production` |
| Logging | Pino redacts `password`, `token`, `secret`, `authorization` fields automatically |
| Ownership checks | Every repository query joins through the authenticated user's ID — no IDOR possible |
| Soft deletes | Rows are never physically deleted — data loss is recoverable |

### Additional hardening steps (manual)

#### HTTPS everywhere

- Vercel: HTTPS is automatic on all deployments.
- Railway: HTTPS is automatic on `*.railway.app` domains and custom domains with Let's Encrypt.
- Render: HTTPS is automatic.
- Self-hosted: Use Caddy or nginx with `certbot` for Let's Encrypt.

Never serve the API over HTTP in production — cookies are `Secure: true` when `NODE_ENV=production`.

#### Database hardening

```sql
-- Create a dedicated app user (don't use the root postgres user)
CREATE USER contextos_app WITH PASSWORD 'strong-password';
GRANT CONNECT ON DATABASE contextos_ai TO contextos_app;
GRANT USAGE ON SCHEMA public TO contextos_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO contextos_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO contextos_app;

-- Revoke public schema access from other users
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
```

#### API server hardening

```bash
# Confirm Helmet headers are active
curl -I https://api.example.com/api/v1/health | grep -i "x-frame\|content-type\|x-dns"

# Confirm no stack traces in error responses
curl -X POST https://api.example.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{}' | jq '.error'
# Should NOT contain "stack" or "at " lines
```

#### Dependency audit

```bash
# Run before every production deployment
pnpm audit --audit-level=high

# Fix automatically where possible
pnpm audit --fix
```

#### Secret rotation

When rotating `JWT_SECRET`:

1. Generate a new secret.
2. Set it in the deployment environment.
3. Redeploy the API.
4. All existing sessions are immediately invalidated — users must log in again.

To rotate without forced logout, implement a "previous secret" fallback for a grace period (not currently implemented).

---

## 11. Monitoring & Logging

### Structured logging (Pino)

The API uses Pino for structured JSON logging. Every request is logged with:

```json
{
  "level": "info",
  "time": 1716489600000,
  "req": { "method": "POST", "url": "/api/v1/auth/login", "id": "abc123" },
  "res": { "statusCode": 200 },
  "responseTime": 43
}
```

**Sensitive fields are automatically redacted**: `password`, `token`, `secret`, `authorization`, `cookie`.

#### Viewing logs

```bash
# Railway — live log tail
railway logs --tail

# Render — in the dashboard: Service → Logs tab

# Docker
docker logs contextos-api --follow --since 10m

# Local dev — pretty-printed (pino-pretty is devDependency only)
pnpm --filter @contextos-ai/api dev
```

#### Log levels by environment

| Environment | Recommended level | Why |
|------------|------------------|-----|
| Production | `info` | Request + error logs, no debug noise |
| Staging | `debug` | More detail for debugging |
| Local dev | `trace` | Full detail |

Set via `LOG_LEVEL` environment variable.

### Health endpoints

| Endpoint | What it checks | Use case |
|----------|---------------|---------|
| `GET /api/v1/health` | Returns `{ status: "ok" }` immediately | Load balancer liveness probe |
| `GET /api/v1/health/ready` | Runs `SELECT 1` against PostgreSQL | Readiness probe before routing traffic |

**Railway health check config:**
```
Health Check Path: /api/v1/health/ready
Timeout: 10s
```

**Render health check config:**
```
Health Check Path: /api/v1/health/ready
```

### Error tracking (Sentry — optional)

To add Sentry for exception capture:

```bash
pnpm --filter @contextos-ai/api add @sentry/node
pnpm --filter @contextos-ai/web add @sentry/nextjs
```

```ts
// apps/api/src/server.ts — add before routes
import * as Sentry from "@sentry/node";
Sentry.init({ dsn: env.SENTRY_DSN, environment: env.NODE_ENV });

// apps/api/src/middleware/error-handler.ts — add before response
Sentry.captureException(err);
```

Add `SENTRY_DSN` to your environment variables (server-side only, never `NEXT_PUBLIC_`).

### Uptime monitoring

Recommended free options:

| Tool | Free tier | Setup |
|------|-----------|-------|
| **Better Uptime** | 50 monitors | Point to `https://api.example.com/api/v1/health/ready` |
| **UptimeRobot** | 50 monitors, 5-min intervals | Same health endpoint |
| **Checkly** | 10k check runs/month | Supports HTTP assertions |

Monitor both the API health endpoint and the frontend landing page.

### Performance monitoring

```bash
# Check API response times
curl -w "\n\nTime: %{time_total}s\n" https://api.example.com/api/v1/health/ready

# Database query performance — enable slow query logging in PostgreSQL
# (Neon/Supabase: available in dashboard)
log_min_duration_statement = 1000  # log queries > 1s
```

---

## 12. Domain Setup

### Recommended domain structure

```
app.example.com    →  Vercel (Next.js frontend)
api.example.com    →  Railway / Render (Express API)
```

Both on the same root domain allows `COOKIE_DOMAIN=.example.com` for seamless subdomain cookie sharing.

### Frontend: Custom domain on Vercel

1. Go to **Project → Settings → Domains**.
2. Add your domain (e.g. `app.example.com`).
3. Vercel shows the required DNS record:
   - **Type:** `CNAME`
   - **Name:** `app`
   - **Value:** `cname.vercel-dns.com`
4. Add the record in your DNS provider (Cloudflare, Route 53, Namecheap, etc.).
5. Vercel automatically provisions a Let's Encrypt SSL certificate.
6. Update `NEXT_PUBLIC_APP_URL=https://app.example.com` in Vercel env vars.

### API: Custom domain on Railway

1. Go to **Service → Settings → Networking → Custom Domain**.
2. Enter `api.example.com`.
3. Railway shows the required DNS record:
   - **Type:** `CNAME`
   - **Name:** `api`
   - **Value:** `<railway-cname>.railway.app`
4. Add the record in your DNS provider.
5. Railway provisions SSL automatically.

### API: Custom domain on Render

1. Go to **Service → Settings → Custom Domain**.
2. Enter `api.example.com`.
3. Render shows a `CNAME` target.
4. Add the DNS record. Render provisions SSL via Let's Encrypt.

### After setting up domains: update environment variables

```bash
# API
CORS_ORIGIN=https://app.example.com

# Web
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_APP_URL=https://app.example.com

# If sharing cookies across subdomains
COOKIE_DOMAIN=.example.com   # note the leading dot
```

### DNS propagation

DNS changes can take up to 48 hours to propagate worldwide (usually 5–30 minutes with TTL=300).

```bash
# Check propagation
dig CNAME app.example.com +short
nslookup api.example.com 8.8.8.8

# Verify SSL certificate
curl -I https://api.example.com/api/v1/health | grep -i "strict-transport"
```

### Cloudflare (recommended DNS provider)

If using Cloudflare as your DNS provider:

- Set the CNAME records with **DNS only** (grey cloud), not **Proxied** (orange cloud), for Railway/Render.
- For Vercel, **Proxied** mode works if you add Vercel's IP range to your Cloudflare settings.
- Enable **Always Use HTTPS** and **HSTS** in Cloudflare SSL/TLS → Edge Certificates.

### Apex domain (root domain)

If you want `example.com` (no subdomain) on Vercel, use an `A` record pointing to Vercel's IP or a `ALIAS`/`ANAME` record if your DNS provider supports it. Cloudflare supports `CNAME` flattening at the root.
