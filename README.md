# ContextOS AI

**An AI-powered project management workspace that actually understands your projects.**

ContextOS AI combines a full project-management tool (projects, Kanban boards, calendar, timeline)
with an AI assistant that has real context about your work — your tasks, documents, milestones, and a
persistent project memory. Instead of a generic chatbot bolted onto a task tracker, the AI can plan
roadmaps, break goals into tasks, read your documents, surface risks, and even create and update tasks
for you — all grounded in what you're actually building.

---

## What can you do with it?

- **Organize projects** — create projects, each with its own board, calendar, documents, and AI assistant.
- **Manage tasks on a Kanban board** — drag-and-drop between To Do / In Progress / Review / Done, with priorities, due dates, and descriptions.
- **Plan with AI** — describe a goal and get a structured roadmap with phases and scheduled tasks generated automatically.
- **Break down work with AI** — turn one big goal into estimated, categorized subtasks with dependencies and sprint suggestions.
- **Chat with a context-aware assistant** — ask questions about your project and get answers grounded in your own tasks, documents, and history.
- **Turn documents into tasks** — upload a PDF, Word, or text brief; the AI reads it and proposes tasks you can import in one click.
- **See risks before they hit** — an insights engine flags overdue work, bottlenecks, low completion, and health scores per project.
- **View work your way** — Kanban board, calendar (month/week/day), and a Gantt-style timeline with milestones.
- **Track everything on a dashboard** — stats, recent activity, and prioritized insights across all projects.
- **Export** — download a project's tasks as CSV or Markdown to share status anywhere.

---

## How it works

### The AI assistant (with RAG)

The core of ContextOS AI is a **context-aware assistant** powered by Google Gemini. When you ask it
something, it doesn't answer blindly — it uses **Retrieval-Augmented Generation (RAG)**:

1. Your project content (tasks, documents, notes) is turned into **embeddings** (numeric vectors) using
   Gemini's `text-embedding-004` model and stored as a persistent **project memory**.
2. When you send a message, your question is embedded too, and a **cosine-similarity search** finds the
   most relevant pieces of your project.
3. Those relevant pieces are injected into the prompt as context, so the assistant's answer is grounded
   in *your* project — not generic guesses.
4. Responses **stream back in real time** using Server-Sent Events (SSE), so you see the answer as it's written.

### Agentic actions

The assistant isn't read-only. An **action detector** inspects what you ask, and if you request something
like "create a task for the login page," an **action executor** actually creates or updates the task in
your project — with a preview you can confirm.

### Document understanding

Upload a PDF, DOCX, or TXT file and the backend parses it (Multer + Mammoth), sends the content to Gemini
for analysis, and extracts structured requirements, deadlines, risks, and **suggested tasks** you can
import into the project directly.

### Insights engine

A rule-based engine analyzes your aggregate project data (overdue tasks, work-in-progress, completion
rate, milestone slippage, health score) and surfaces prioritized **insights** on the dashboard and in a
notifications bell — so problems are visible before they grow.

---

## Tech stack

**Frontend**
- Next.js 16 (App Router) · React 19 · TypeScript
- Tailwind CSS v4 · ShadCN UI (Radix UI primitives) · `next-themes` (light / dark / system)
- TanStack Query (server state) · Zustand (client state)
- React Hook Form + Zod (forms & validation)
- dnd-kit (drag-and-drop Kanban) · FullCalendar (calendar) · Recharts (charts)
- react-markdown + remark-gfm (AI message rendering) · Motion (animation) · Sonner (toasts) · lucide-react (icons)
- Command palette (Ctrl/⌘+K), collapsible sidebar, keyboard shortcuts

**Backend**
- Express 5 · TypeScript (ESM) · clean controller → service → repository architecture
- Server-Sent Events (SSE) streaming for AI responses
- Zod-validated request/response contracts
- Security & ops: Helmet, CORS allow-listing, `express-rate-limit`, compression, Pino structured logging

**AI & RAG**
- Google Gemini via `@google/generative-ai`, behind a swappable `AiProvider` interface
- Streaming chat, roadmap planning, task breakdown, and 21 insight types
- RAG: `text-embedding-004` embeddings + cosine-similarity semantic search over a persistent project memory
- Agentic action detection/execution (the assistant can create and update tasks)
- Document understanding: PDF / DOCX / TXT upload (Multer + Mammoth) + Gemini analysis

**Auth & data**
- Clerk authentication (`@clerk/nextjs` + `@clerk/express`), user sync via Svix-verified webhooks
- PostgreSQL via Prisma (additive, zero-downtime migrations)

---

## Project structure

Two standalone apps — each installs, builds, and deploys independently:

```
contextos-ai/
├── frontend/                  # Next.js app (the UI)
│   └── src/
│       ├── app/               # Pages: dashboard, projects, AI, settings, about, help
│       ├── features/          # Feature modules (ai, task, project, document, calendar, insights, ...)
│       ├── components/        # Shared UI (command palette, theme toggle, sidebar, notifications)
│       ├── env/               # Validated client/server env access
│       └── lib/
│           ├── config/        # Zod env schemas
│           └── validators/    # Zod validators (shared shape with backend)
├── backend/                   # Express API
│   ├── prisma/                # Prisma schema + migrations
│   └── src/
│       ├── modules/           # One folder per domain (ai, auth, project, task, memory, document, ...)
│       │                      #   each with controller / service / repository
│       ├── config/            # cors, helmet, rate-limit, env schema
│       ├── database/          # Prisma client singleton
│       ├── validators/        # Zod validators (shared shape with frontend)
│       └── middleware/        # error handling, request context
└── README.md
```

> The Zod validators in `frontend/src/lib/validators` and `backend/src/validators` are intentionally
> kept as synced copies so each app builds and deploys standalone. If you change a schema, update both.

---

## Getting started

**Requirements:** Node.js ≥ 20, pnpm ≥ 9, PostgreSQL ≥ 14, a free [Clerk](https://clerk.com) app, and a
free [Gemini API key](https://aistudio.google.com/app/apikey).

```bash
# 1. Configure environment (fill in your keys — see the .env.example files)
cp backend/.env.example backend/.env.local
cp frontend/.env.example frontend/.env.local

# 2. Backend — install, run migrations, start (API on http://localhost:4000)
cd backend
pnpm install
pnpm db:migrate
pnpm dev

# 3. Frontend — install and start (UI on http://localhost:3000), in a second terminal
cd frontend
pnpm install
pnpm dev
```

Then open **http://localhost:3000**, sign up, and create your first project.

### Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl` / `⌘` + `K` | Open the command palette (jump to any page or project) |
| `N` | New task (on a project page) |
| `Esc` | Close dialogs and menus |

---

## Useful scripts (run inside `frontend/` or `backend/`)

| Command | What it does |
|---------|--------------|
| `pnpm dev` | Run the app in watch mode |
| `pnpm build` | Production build |
| `pnpm type-check` / `pnpm lint` | Static checks |
| `pnpm db:migrate` / `pnpm db:studio` | (backend) Prisma migrations / database browser |

## Environment variables

All variables are documented in `backend/.env.example` and `frontend/.env.example`. Copy each to
`.env.local` and fill in your keys (Clerk keys, `DATABASE_URL`, and `GEMINI_API_KEY`).

---

## Deployment

The two apps deploy independently:

- **Frontend** → Vercel (set the project root to `frontend/`).
- **Backend** → Railway / Render / any Node host (set the root to `backend/`, build with `pnpm build`, start with `node dist/index.js`, and run `pnpm db:deploy` for migrations).
- **Database** → any managed PostgreSQL (Neon, Supabase, Railway, etc.).
