# Features

Feature-scoped code lives here, one folder per domain.

## Convention

```
features/<domain>/
├── components/         feature-specific UI (forms, lists, cards)
├── hooks/              custom hooks (useLogin, useProjects)
├── queries/            TanStack Query useQuery wrappers
├── mutations/          TanStack Query useMutation wrappers
└── index.ts            barrel: public surface
```

## What goes here vs `components/`

- `components/ui/` — cross-cutting primitives (Button, Card, Dialog) — added via the ShadCN CLI
- `components/layout/` — top-level layout primitives (Sidebar, Topbar, DashboardShell)
- `features/<domain>/components/` — anything specific to one feature

## Deleting a feature

`rm -rf src/features/<domain>/` is the source of truth. If references break in `app/` or `components/`, those are the only follow-ups needed.

## Domains expected (added as product features land)

- `auth/` — login/signup forms, useCurrentUser hook
- `user/` — profile editor, preferences panel
- `project/` — project CRUD UI
- `task/` — kanban board, task forms
