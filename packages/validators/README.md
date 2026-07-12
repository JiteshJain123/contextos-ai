# @contextos-ai/validators

Shared Zod schemas — one source of truth used identically by frontend forms and backend routes.

## Why this package exists

When frontend and backend each define their own schemas, drift is inevitable. A new required field gets added on the server, the form forgets it, and prod users see "400 Bad Request" they can't fix. This package eliminates the problem structurally:

- One schema, two consumers (form + API)
- TypeScript types **inferred** from schemas — drift becomes a compile error
- A field's validation rule (e.g. "email must be lowercase") is **enforced everywhere automatically**
- Adding a field is a single-file change

## Structure

```
src/
├── index.ts          combined re-exports
├── parse.ts          parseInput() + ValidationError class
├── primitives.ts     email, password, cuid, slug, name, httpUrl
├── pagination.ts     pagination params + paginated<T> wrapper
├── auth.ts           login, signup, password reset/change, session DTO
├── user.ts           profile, preferences, public + current user DTOs
├── project.ts        create/update/DTO
├── task.ts           create/update/status + status & priority enums + DTO
└── ai.ts             scaffold for future AI module schemas
```

One file per domain. When a domain reaches ~300 lines, split it into a folder (`auth/login.ts`, `auth/password.ts`, …). Don't pre-fragment.

## Subpath exports

```ts
// Preferred — tree-shaking friendly
import { loginSchema, type LoginInput } from "@contextos-ai/validators/auth";
import { taskStatusEnum } from "@contextos-ai/validators/task";
import { parseInput, ValidationError } from "@contextos-ai/validators/parse";

// Acceptable, but pulls every domain into the bundle
import { loginSchema } from "@contextos-ai/validators";
```

Subpaths exported: `/auth`, `/user`, `/project`, `/task`, `/ai`, `/pagination`, `/primitives`, `/parse`.

## Consumption patterns

### Backend (Express route handler)

```ts
import { loginSchema, type LoginInput } from "@contextos-ai/validators/auth";
import { parseInput, ValidationError } from "@contextos-ai/validators/parse";

app.post("/auth/login", async (req, res) => {
  try {
    const input: LoginInput = parseInput(loginSchema, req.body);
    // ... authenticate
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(400).json(err);
    }
    throw err;
  }
});
```

### Frontend (Next.js form with react-hook-form)

```tsx
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { loginSchema, type LoginInput } from "@contextos-ai/validators/auth";

export function LoginForm() {
  const { register, handleSubmit, formState } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });
  // ... same validation rules as the backend
}
```

## DTO pattern (Input vs Output)

| Flavor            | Direction       | Example                 | Purpose                                                                   |
| ----------------- | --------------- | ----------------------- | ------------------------------------------------------------------------- |
| **Input schemas** | client → server | `createProjectSchema`   | Validate request bodies + form data                                       |
| **Output DTOs**   | server → client | `projectDTO`, `userDTO` | Define response shape; **never** leaks private fields like `passwordHash` |

Naming:

- Inputs: `createProjectSchema`, `loginSchema`, `updateTaskSchema`
- DTOs: `projectDTO`, `userDTO`, `taskDTO`, `sessionDTO`
- Enums: `taskStatusEnum`, `taskPriorityEnum`
- Inferred types: `CreateProjectInput`, `LoginInput`, `ProjectDTO`, `TaskStatus`

## Adding a new domain

1. Create `src/<domain>.ts`
2. Add the subpath export entry to `package.json`'s `exports` map
3. Add a line to `src/index.ts` re-exporting it
4. Update this README's structure section

## When to extend an existing domain vs add a new one

- **Extending `user.ts`**: change to existing user fields, add preferences keys, add user-only sub-resources
- **New domain file**: a new top-level concept with its own table (or its own integration like `billing.ts`, `notifications.ts`)

## Adding to the AI module

`ai.ts` is currently scaffolded with conventions documented inline. As product specs land:

- Workflow steps → use `z.discriminatedUnion("type", [...])` over step types (`llm-call`, `tool-call`, `branch`, etc.)
- Streaming responses → separate chunk shape vs final response schemas
- Tool definitions → input + output schemas per tool, with cross-references via `cuidSchema`

## Versioning the schema

Schemas live in source; rolling out a breaking schema change means a coordinated FE+BE deploy. For zero-downtime changes:

1. Add the new field as `optional` first → both sides understand it but neither requires it
2. Backfill data (if persisted)
3. Make the field required → both sides updated in the same release
