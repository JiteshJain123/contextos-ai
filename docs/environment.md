# Environment Variable Strategy

This monorepo treats environment variables as a **typed runtime contract**.
Variables flow through three layers — file discovery, validation, typed access —
each with a single source of truth.

## File layout

```
.env.example                  Template for shared root vars (DATABASE_URL, NODE_ENV)
.env                          (gitignored) Actual local values for shared vars
.env.local                    (gitignored) Local-only overrides

apps/api/.env.example         Template for API server vars
apps/api/.env                 (gitignored) Local API values
apps/api/.env.local           (gitignored) Local API overrides

apps/web/.env.example         Template for web app vars (incl. NEXT_PUBLIC_*)
apps/web/.env.local           (gitignored) Local web overrides
```

Only `*.example` files are committed. Real `.env*` files are blocked by
`.gitignore`.

## Loading precedence

Each app loads files in this order, with **later sources overriding earlier ones**:

1. `.env` — committed defaults (rare; prefer `.env.example`)
2. `.env.development` / `.env.production` — committed environment-specific defaults
3. `.env.local` — uncommitted local overrides
4. Process environment — set by the platform (Docker, Vercel, CI, etc.)

For Next.js, this is built into `next dev`. For the Express API, we'll wire
`dotenv` at boot in `apps/api/src/index.ts`.

## Validation

All `process.env` access is funneled through `@contextos-ai/config`,
which exports a typed `env` object validated with Zod at boot:

```ts
import { env } from "@contextos-ai/config";

env.DATABASE_URL; // typed string, validated as a Postgres URL
env.PORT; // typed number, coerced from string
```

If any required variable is missing or malformed, the process **crashes at boot**
with a descriptive error — never silently runs with `undefined`.

## Public vs. server-only (Next.js)

| Prefix          | Where it lives         | Exposed to browser?                                            |
| --------------- | ---------------------- | -------------------------------------------------------------- |
| `NEXT_PUBLIC_*` | Bundled into client JS | **Yes** — treat as public                                      |
| (no prefix)     | Server runtime only    | No — used in Server Components, Route Handlers, server actions |

Anything sensitive (API keys, DB URLs, JWT secrets) MUST NOT have the
`NEXT_PUBLIC_` prefix.

## Rotating secrets

1. Update the value in your secret manager (Vercel, Doppler, AWS, etc.)
2. Redeploy — the next boot picks up the new value
3. Update teammates' local `.env.local` if dev-side rotation is needed
