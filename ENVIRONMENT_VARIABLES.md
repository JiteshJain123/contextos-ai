# contextos-ai — Environment Variables Reference

> Complete reference for all environment variables used by the monorepo.
> Keep this file in sync with `apps/api/.env.example` and `apps/web/.env.example`.

---

## Quick-start: Copy Templates

```bash
# API
cp apps/api/.env.example apps/api/.env.local

# Web
cp apps/web/.env.example apps/web/.env.local
```

---

## Generating Secrets

```bash
# JWT_SECRET — 48 random bytes → 64-char base64url string (recommended)
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

# Alternatively with OpenSSL
openssl rand -base64 48

# NEVER use human-readable passphrases for secrets.
```

---

## API Variables (`apps/api`)

### Runtime

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | `development` | Must be `production` in prod. Controls error detail level in responses. |
| `LOG_LEVEL` | No | `info` | Pino log level: `trace` \| `debug` \| `info` \| `warn` \| `error` \| `fatal` |

### HTTP Server

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `4000` | TCP port the Express server binds to. Set by Railway/Render automatically. |
| `HOST` | No | `0.0.0.0` | Bind address. `0.0.0.0` required for container runtimes. |

### Database

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | **Yes** | — | Full PostgreSQL connection string. **Must** include `?sslmode=require` on managed providers. |

**Format:** `postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require`

**Provider examples:**
```bash
# Railway (auto-injected when you add a Postgres plugin)
DATABASE_URL=${{ Postgres.DATABASE_URL }}

# Neon (Serverless)
DATABASE_URL=postgresql://user:pass@ep-cool-name-123.us-east-2.aws.neon.tech/neondb?sslmode=require

# Supabase (transaction pooler — use port 6543 for serverless)
DATABASE_URL=postgresql://postgres.xxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# Supabase (session mode — use for migrations, port 5432)
DATABASE_URL=postgresql://postgres.xxx:password@aws-0-us-east-1.pooler.supabase.com:5432/postgres

# Local development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/contextos_ai
```

> **PgBouncer note:** If using Supabase/Neon's transaction-mode pooler, add `&pgbouncer=true&connection_limit=5` to the URL and set a low `connection_limit` in Prisma's datasource block.

### Auth

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | **Yes** | — | Signs access + refresh tokens. Minimum 32 chars. Generate with CSPRNG. |
| `ACCESS_TOKEN_EXPIRES_IN` | No | `15m` | Short-lived access token TTL. Format: `15m`, `1h`. |
| `REFRESH_TOKEN_EXPIRES_IN` | No | `30d` | Long-lived refresh token TTL. Format: `7d`, `30d`. |
| `COOKIE_DOMAIN` | No | — | Set to `.example.com` when API (`api.example.com`) and web (`app.example.com`) are on different subdomains of the same root domain. Leave unset for different domains. |

**Security rules:**
- `JWT_SECRET` must be at least 48 characters in production (enforced by Zod schema at 32).
- Rotating `JWT_SECRET` invalidates **all** active sessions immediately.
- `REFRESH_TOKEN_EXPIRES_IN` controls how long users stay logged in. `30d` is the recommended production value.

### CORS

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CORS_ORIGIN` | **Yes (prod)** | — | Comma-separated list of allowed frontend origins. Exact match — no wildcards, no trailing slash. |

**Examples:**
```bash
# Single origin
CORS_ORIGIN=https://app.example.com

# Multiple origins (staging + production)
CORS_ORIGIN=https://app.example.com,https://staging.example.com

# Local dev (any origin — do NOT use in production)
# Leave unset in development, the API defaults to permissive mode.
```

> See `apps/api/src/server.ts` for the CORS middleware configuration.

### AI Providers

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | For AI | — | Google Gemini API key. Get from [aistudio.google.com](https://aistudio.google.com/app/apikey). Without it, AI endpoints return 503 but the server starts. |
| `OPENAI_API_KEY` | No | — | Reserved for future OpenAI integration. Not used currently. |
| `ANTHROPIC_API_KEY` | No | — | Reserved for future Anthropic integration. Not used currently. |

> **Cost control:** The AI rate limiter caps Gemini calls to 50/hour/IP. In production, monitor your Google AI Studio billing dashboard.

### Optional Integrations

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REDIS_URL` | No | — | Redis connection URL. Required when running multiple API replicas to share rate-limit state. Format: `redis://user:pass@host:6379` or `rediss://` for TLS. |
| `PINECONE_API_KEY` | No | — | Vector DB for future AI memory features. |
| `PINECONE_INDEX` | No | — | Pinecone index name. |
| `PINECONE_ENVIRONMENT` | No | — | Pinecone region (e.g. `us-east-1-aws`). |

---

## Web Variables (`apps/web`)

### Security Rule

> `NEXT_PUBLIC_*` variables are **inlined into the browser bundle at build time**.
> Never put secrets, API keys, or database credentials in `NEXT_PUBLIC_*` variables.

### Public (browser-visible)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_APP_NAME` | No | `contextos-ai` | Application name shown in the UI, page titles, and sidebar. |
| `NEXT_PUBLIC_APP_URL` | **Yes** | — | Canonical public URL of this frontend. No trailing slash. Used for OG metadata and canonical links. |
| `NEXT_PUBLIC_API_URL` | **Yes** | — | Full URL of the Express API. Must be browser-reachable. No trailing slash. |

**Production values:**
```bash
NEXT_PUBLIC_APP_NAME=contextos-ai
NEXT_PUBLIC_APP_URL=https://app.example.com
NEXT_PUBLIC_API_URL=https://api.example.com
```

**Local dev values (in `.env.local`):**
```bash
NEXT_PUBLIC_APP_NAME=contextos-ai (dev)
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

### Server-only

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Conditional | — | Only needed if the web app accesses the DB directly (e.g. server actions, future direct queries). If web only talks to the API over HTTP, omit this. |

### Build-time

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_OUTPUT` | No | — | Set to `standalone` for Docker/Railway/Render self-hosted deployments. **Do NOT set on Vercel** — Vercel handles output format automatically. |

---

## Environment Setup by Platform

### Vercel (Web)

In **Project → Settings → Environment Variables**, add:

```
NEXT_PUBLIC_APP_NAME    = contextos-ai
NEXT_PUBLIC_APP_URL     = https://<your-vercel-domain>
NEXT_PUBLIC_API_URL     = https://api.example.com
```

Vercel automatically scopes variables to `Production`, `Preview`, and `Development`. Set `NEXT_PUBLIC_API_URL` to a staging API for Preview deployments.

### Railway (API)

In **Project → Variables**, add all API variables. Railway auto-injects `DATABASE_URL`, `PORT`, and `RAILWAY_ENVIRONMENT` when you provision a Postgres plugin.

```
NODE_ENV              = production
JWT_SECRET            = <generated>
CORS_ORIGIN           = https://app.example.com
GEMINI_API_KEY        = <key>
LOG_LEVEL             = info
```

### Render (API)

In **Dashboard → Service → Environment**, add variables. Render provides `DATABASE_URL` automatically when you create a linked PostgreSQL database.

### Docker Compose (local full-stack)

```yaml
# docker-compose.yml
services:
  api:
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://postgres:postgres@db:5432/contextos_ai
      JWT_SECRET: ${JWT_SECRET}
      CORS_ORIGIN: http://localhost:3000
      GEMINI_API_KEY: ${GEMINI_API_KEY}
  web:
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:4000/api/v1
      NEXT_PUBLIC_APP_URL: http://localhost:3000
      NEXT_PUBLIC_APP_NAME: contextos-ai
```

---

## Security Checklist for Environment Variables

- [ ] `JWT_SECRET` is at least 48 chars, generated with a CSPRNG
- [ ] `DATABASE_URL` uses SSL (`?sslmode=require`) on all managed PostgreSQL providers
- [ ] No `.env` files with real values are committed to git (`.env.local` is in `.gitignore`)
- [ ] `CORS_ORIGIN` is set to the exact frontend URL — no wildcards, no trailing slash
- [ ] `GEMINI_API_KEY` and other AI keys are in the API service only, never in the web service
- [ ] Staging and production use different secrets (rotate on environment promotion)
- [ ] `NODE_ENV=production` disables stack traces and debug output in error responses
