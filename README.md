# ContextOS AI

AI-powered project management SaaS — projects, Kanban tasks, calendar/timeline views, and a context-aware AI assistant (chat, planning, task breakdown, insights, document understanding) built on Google Gemini with a retrieval-augmented (RAG) project memory.

## Stack

**Frontend**
- Next.js 16 (App Router) · React 19 · TypeScript
- Tailwind CSS v4 · ShadCN UI (Radix UI primitives) · `next-themes` (light/dark/system)
- TanStack Query (server state) · Zustand (client state)
- React Hook Form + Zod (forms & validation)
- dnd-kit (drag-and-drop Kanban) · FullCalendar (calendar) · Recharts (charts)
- react-markdown + remark-gfm (AI message rendering) · Motion (animation) · Sonner (toasts) · lucide-react (icons)

**Backend**
- Express 5 · TypeScript (ESM) · controller → service → repository architecture
- SSE (Server-Sent Events) streaming for AI responses
- Zod-validated request/response contracts
- Security & ops: Helmet, CORS allow-listing, `express-rate-limit`, compression, Pino structured logging

**AI & RAG**
- Google Gemini via `@google/generative-ai`, behind a swappable `AiProvider` interface
  - Chat / planning / breakdown: `gemini-*-flash` models with streaming
  - **Retrieval-Augmented Generation (RAG):** `text-embedding-004` embeddings + cosine-similarity semantic search over a persistent **project memory**, injected as context into prompts
  - **Agentic actions:** an action-detector/executor lets the assistant create and update tasks from chat
- **Document understanding:** PDF / DOCX / TXT upload (Multer + Mammoth), Gemini analysis, one-click task import

**Auth**
- Clerk (`@clerk/nextjs` + `@clerk/express`), user sync via Svix-verified webhooks

**Database**
- PostgreSQL via Prisma (additive, zero-downtime migrations)

## Structure

Two standalone apps — each installs, builds, and deploys independently:

```
contextos-ai/
├── frontend/                  # Next.js app
│   └── src/
│       ├── app/               # App Router pages + global styles
│       ├── features/          # Feature modules (ai, task, project, ...)
│       ├── components/        # Shared UI components
│       ├── env/               # Validated client/server env access
│       └── lib/
│           ├── config/        # Zod env schemas
│           └── validators/    # Zod validators (kept in sync with backend)
├── backend/                   # Express API
│   ├── prisma/                # Prisma schema + migrations
│   └── src/
│       ├── modules/           # controller/service/repository per domain
│       ├── config/            # cors, helmet, rate-limit, env schema
│       ├── database/          # Prisma client singleton
│       ├── validators/        # Zod validators (kept in sync with frontend)
│       └── middleware/        # error handling, request context
└── README.md
```

> `frontend/src/lib/validators` and `backend/src/validators` are intentionally duplicated
> copies of the same Zod schemas so each app deploys standalone. If you change a schema,
> update both.

## Getting started

Requirements: Node.js ≥ 20, pnpm ≥ 9, PostgreSQL ≥ 14, a [Clerk](https://clerk.com) app, and a [Gemini API key](https://aistudio.google.com/app/apikey).

```bash
# 1. Configure env (fill in your keys)
cp backend/.env.example backend/.env.local
cp frontend/.env.example frontend/.env.local

# 2. Backend — install, migrate, run (API on :4000)
cd backend
pnpm install
pnpm db:migrate
pnpm dev

# 3. Frontend — install and run (UI on :3000), in a second terminal
cd frontend
pnpm install
pnpm dev
```

## Useful scripts (run inside `frontend/` or `backend/`)

| Command | What it does |
|---------|--------------|
| `pnpm dev` | Run the app in watch mode |
| `pnpm build` | Production build |
| `pnpm type-check` / `pnpm lint` | Static checks |
| `pnpm db:migrate` / `pnpm db:studio` | (backend) Prisma migrations / DB browser |

## Environment variables

Documented in `backend/.env.example` and `frontend/.env.example` — copy each to
`.env.local` and fill in your keys.
