# @contextos-ai/config

Typed, validated, fail-fast environment configuration for every workspace.

## Why this package exists

- **One schema, one source of truth** — Zod schema produces both runtime validation and TypeScript types.
- **No `process.env.X` in app code** — apps import a typed `env` object instead of stringly-typed lookups.
- **Boot crashes if env is broken** — every issue surfaced in one error message; no silent `undefined`.
- **Server / client split is enforced** — secrets cannot leak into the browser bundle by structure, not discipline.

## Architecture

```
src/
├── index.ts        ← combined re-exports (use for typegen)
├── server.ts       ← server-only schema + createServerEnv
├── client.ts       ← NEXT_PUBLIC_* schema + createClientEnv
└── validate.ts     ← internal: pretty-error formatter
```

Three subpath entry points:

| Import path                   | Use from                                                                               |
| ----------------------------- | -------------------------------------------------------------------------------------- |
| `@contextos-ai/config/server` | Express, Next.js Server Components, Route Handlers, server actions, scripts            |
| `@contextos-ai/config/client` | Next.js Client Components, anywhere in `apps/web/src` reachable from the browser graph |
| `@contextos-ai/config`        | Tooling / typegen needing both shapes                                                  |

## Usage

### Express backend (`apps/api`)

```ts
// apps/api/src/env.ts
import "dotenv/config";

import { createServerEnv } from "@contextos-ai/config/server";

export const env = createServerEnv(process.env);
```

```ts
// apps/api/src/index.ts
import { env } from "./env.js";

console.log(`Listening on http://${env.HOST}:${env.PORT}`);
```

If `DATABASE_URL` is missing or `PORT` is non-numeric, the process exits at boot
with a complete list of issues.

### Next.js frontend (`apps/web`)

```ts
// apps/web/src/env/server.ts — Server-only env
import { createServerEnv } from "@contextos-ai/config/server";

export const serverEnv = createServerEnv(process.env);
```

```ts
// apps/web/src/env/client.ts — Browser-safe env
import { createClientEnv } from "@contextos-ai/config/client";

export const clientEnv = createClientEnv();
```

In a Client Component:

```tsx
"use client";
import { clientEnv } from "@/env/client";

export function Footer() {
  return <a href={clientEnv.NEXT_PUBLIC_APP_URL}>{clientEnv.NEXT_PUBLIC_APP_NAME}</a>;
}
```

## Adding a new variable

1. Add the field to the appropriate schema (`server.ts` or `client.ts`)
2. Add the variable to the relevant `.env.example` file(s)
3. The TypeScript type updates automatically via `z.infer`
4. Document the variable (purpose, format, defaults) in this README if non-obvious

## Test mode

Inject a mock env to test without touching `process.env`:

```ts
import { createServerEnv } from "@contextos-ai/config/server";

const env = createServerEnv({
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://test/test",
  JWT_SECRET: "x".repeat(32),
});
```

## Security boundary

| Concern                              | Mechanism                                                      |
| ------------------------------------ | -------------------------------------------------------------- |
| Secret in browser bundle             | `client.ts` schema rejects non-`NEXT_PUBLIC_*` keys at runtime |
| Forgot to set a required var in prod | Boot crashes with explicit error                               |
| Wrong type (`PORT=banana`)           | Zod coercion + validation catches it                           |
| Outdated env in deployment           | CI runs `pnpm type-check` which exercises the schemas          |
