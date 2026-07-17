import { GoogleGenerativeAI } from "@google/generative-ai";

import type { SuggestedTask } from "@/validators/ai";
import { logger } from "../../lib/logger.js";
import type { AiChatResult, ChatMessage, RichProjectContext } from "./ai.types.js";

const GEMINI_MODEL = "gemini-3.1-flash-lite";

/**
 * AI provider abstraction.
 *
 * `streamChat`   — async generator for SSE chat streaming.
 * `suggestTasks` — one-shot structured generation; returns a task list as JSON.
 *
 * Swap GeminiProvider for OpenAiProvider / AnthropicProvider without touching
 * the service layer.
 */
export interface AiProvider {
  streamChat(params: {
    history: ChatMessage[];
    userMessage: string;
    systemPrompt: string;
  }): AsyncGenerator<string, AiChatResult, undefined>;

  suggestTasks(params: {
    projectName: string;
    projectDescription: string | null;
    userPrompt: string;
  }): Promise<SuggestedTask[]>;

  /**
   * Streams an AI task breakdown for a high-level goal.
   * Yields raw text chunks (NDJSON lines); the caller is responsible for
   * buffering and parsing complete JSON lines into task objects.
   */
  streamBreakdown(params: {
    projectName: string;
    projectDescription: string | null;
    existingTaskTitles: string[];
    goal: string;
  }): AsyncGenerator<string, void, undefined>;
}

/**
 * Gemini provider implementation.
 *
 * A new model instance is created per request so the systemInstruction
 * carries the project context for that specific conversation.
 */
export class GeminiProvider implements AiProvider {
  constructor(private readonly apiKey: string) {}

  async *streamChat({
    history,
    userMessage,
    systemPrompt,
  }: {
    history: ChatMessage[];
    userMessage: string;
    systemPrompt: string;
  }): AsyncGenerator<string, AiChatResult, undefined> {
    const genAI = new GoogleGenerativeAI(this.apiKey);

    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: systemPrompt,
    });

    const geminiHistory = history.map((msg) => ({
      role: msg.role === "USER" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({ history: geminiHistory });

    let result: Awaited<ReturnType<typeof chat.sendMessageStream>>;
    try {
      result = await chat.sendMessageStream(userMessage);
    } catch (err) {
      logger.error(
        {
          err,
          geminiStatus: (err as Record<string, unknown>).status,
          geminiStatusText: (err as Record<string, unknown>).statusText,
          geminiErrorDetails: (err as Record<string, unknown>).errorDetails,
        },
        "Gemini sendMessageStream failed",
      );
      throw err;
    }

    let fullContent = "";
    try {
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          fullContent += text;
          yield text;
        }
      }
    } catch (err) {
      logger.error(
        {
          err,
          geminiStatus: (err as Record<string, unknown>).status,
          geminiStatusText: (err as Record<string, unknown>).statusText,
          geminiErrorDetails: (err as Record<string, unknown>).errorDetails,
          partialContent: fullContent.slice(0, 200),
        },
        "Gemini response stream iteration failed",
      );
      throw err;
    }

    const response = await result.response;
    const usage = response.usageMetadata;

    return {
      content: fullContent,
      promptTokens: usage?.promptTokenCount ?? undefined,
      completionTokens: usage?.candidatesTokenCount ?? undefined,
    };
  }

  async suggestTasks({
    projectName,
    projectDescription,
    userPrompt,
  }: {
    projectName: string;
    projectDescription: string | null;
    userPrompt: string;
  }): Promise<SuggestedTask[]> {
    const genAI = new GoogleGenerativeAI(this.apiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const prompt = [
      `You are a project management AI for the project "${projectName}".`,
      projectDescription ? `Project context: ${projectDescription}` : "",
      `User request: ${userPrompt}`,
      "",
      "Generate 3 to 6 specific, actionable tasks based on this request.",
      "Return ONLY a valid JSON array — no markdown fences, no explanation.",
      'Schema: [{ "title": string (required, ≤ 100 chars), "description"?: string (optional, ≤ 100 chars), "priority": "LOW"|"MEDIUM"|"HIGH"|"URGENT" }]',
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const result = await model.generateContent(prompt);
      const raw = result.response.text().trim();
      const cleaned = raw.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
      const parsed = JSON.parse(cleaned) as unknown[];
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter(
          (t): t is Record<string, unknown> =>
            typeof t === "object" && t !== null && typeof (t as Record<string, unknown>).title === "string",
        )
        .slice(0, 8)
        .map((t) => ({
          title: String(t.title).slice(0, 200),
          description: t.description ? String(t.description).slice(0, 500) : undefined,
          priority: (["LOW", "MEDIUM", "HIGH", "URGENT"] as const).includes(t.priority as never)
            ? (t.priority as SuggestedTask["priority"])
            : "MEDIUM",
        }));
    } catch (err) {
      logger.error({ err }, "suggestTasks: Gemini response parse failed");
      return [];
    }
  }

  async *streamBreakdown({
    projectName,
    projectDescription,
    existingTaskTitles,
    goal,
  }: {
    projectName: string;
    projectDescription: string | null;
    existingTaskTitles: string[];
    goal: string;
  }): AsyncGenerator<string, void, undefined> {
    const genAI = new GoogleGenerativeAI(this.apiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const today = new Date().toISOString().slice(0, 10);

    const existingSection =
      existingTaskTitles.length > 0
        ? `\nExisting tasks (avoid creating duplicates):\n${existingTaskTitles.map((t) => `- ${t}`).join("\n")}`
        : "";

    const prompt = [
      `You are an expert engineering lead planning a 4-sprint execution for the project "${projectName}".`,
      projectDescription ? `Project description: ${projectDescription}` : null,
      existingSection || null,
      `Today's date (for suggestedDueDate): ${today}`,
      ``,
      `Goal: "${goal}"`,
      ``,
      `Generate 8 to 12 specific, immediately actionable engineering tasks for this goal.`,
      `Tasks must be beginner-friendly: narrow in scope, clearly named, and include concrete guidance.`,
      ``,
      `Quality rules (follow strictly):`,
      `- Every title must start with an action verb: Create, Build, Write, Configure, Test, Deploy, Implement, Set up, Add, Define`,
      `- Each task must be completable in 1–8 hours — never vague (e.g., "Improve X", "Handle errors", "Add tests")`,
      `- Be specific: "Write unit tests for POST /auth/register" not "Write tests"`,
      `- sprintOrder 1 = data models, DB schemas, core config, auth foundations`,
      `- sprintOrder 2 = core API endpoints, business logic, integrations`,
      `- sprintOrder 3 = UI components, frontend integration, API wiring`,
      `- sprintOrder 4 = testing pipelines, CI/CD, deployment, polish`,
      `- CAPACITY: Keep each sprint under 40 hours (target 25–35h). Spread tasks across sprints rather than overloading one sprint.`,
      `- DEPENDENCIES must flow forward: Sprint N tasks cannot depend on Sprint N+1+ tasks. Never create circular or backward dependencies. Sprint 1 tasks can only depend on other Sprint 1 tasks (or have no deps).`,
      `- DEDUPLICATION: Before emitting a task, check your entire output so far for semantic equivalents. "Configure auth middleware" and "Set up auth middleware" are duplicates — emit one only. Also never re-create any task from the existing tasks list (check titles semantically, not just exact match).`,
      `- CRITICAL PATH: If 2+ tasks in your output depend on the same prerequisite, mark that prerequisite HIGH or URGENT priority — it blocks the most work.`,
      ``,
      `Output a JSON array where each task object is on its own line (NDJSON format):`,
      `[`,
      `{"title":"Create User schema in Prisma","description":"Define User model with email, passwordHash, createdAt; run initial migration","priority":"HIGH","status":"TODO","estimatedHours":1,"assigneeRole":"Backend Dev","week":1,"sprintOrder":1,"category":"database","complexity":"S","suggestedDueDate":"${today.slice(0, 7)}-${String(Number(today.slice(8)) + 7).padStart(2, "0")}","dependencies":[],"acceptanceCriteria":["Migration runs without errors","User table has email (unique) and passwordHash columns","createdAt/updatedAt timestamps present"],"implementationNotes":"Use prisma migrate dev, add @@unique([email]), include timestamps"}`,
      `{"title":"Build POST /api/auth/register endpoint","description":"Accept email + password, hash with bcrypt, create user row, return signed JWT","priority":"HIGH","status":"TODO","estimatedHours":3,"assigneeRole":"Backend Dev","week":1,"sprintOrder":2,"category":"backend","complexity":"M","suggestedDueDate":"${today.slice(0, 7)}-${String(Number(today.slice(8)) + 14).padStart(2, "0")}","dependencies":["Create User schema in Prisma"],"acceptanceCriteria":["Returns 201 with JWT on success","Returns 409 if email already exists","Password stored as bcrypt hash","JWT contains userId and expiry"],"implementationNotes":"bcrypt cost factor 12, sign JWT with jsonwebtoken 7d expiry, validate email with zod"}`,
      `]`,
      ``,
      `Field schema (use exactly):`,
      `- title: string, max 80 chars, starts with action verb`,
      `- description: string, max 200 chars, what specifically to build`,
      `- priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"`,
      `- status: always "TODO"`,
      `- estimatedHours: integer 1–16 (realistic engineering estimate)`,
      `- assigneeRole: "Frontend Dev" | "Backend Dev" | "Full-Stack Dev" | "DevOps" | "Designer" | "QA Engineer"`,
      `- week: 1 | 2 (legacy — set to sprintOrder clamped to 1 or 2 for backward compat)`,
      `- sprintOrder: integer 1–4 (sprint number based on rules above)`,
      `- category: "frontend" | "backend" | "database" | "testing" | "deployment"`,
      `- complexity: "XS" | "S" | "M" | "L" | "XL"  (XS<1h, S=1-2h, M=3-5h, L=6-10h, XL=11-16h)`,
      `- suggestedDueDate: ISO date YYYY-MM-DD; Sprint 1 = today+7, Sprint 2 = today+14, Sprint 3 = today+21, Sprint 4 = today+28`,
      `- dependencies: string[] — exact titles of prerequisite tasks from this same list (empty array if none)`,
      `- acceptanceCriteria: string[] — 2 to 4 testable "done" conditions (start with "User can", "API returns", "Test passes for", etc.)`,
      `- implementationNotes: string, max 200 chars — specific tools, libraries, commands, or approach`,
      ``,
      `Output ONLY the JSON array. No markdown code fences. No explanation text. Place each complete task JSON on its own line.`,
    ]
      .filter((line): line is string => line !== null)
      .join("\n");

    const chat = model.startChat({ history: [] });
    let result: Awaited<ReturnType<typeof chat.sendMessageStream>>;
    try {
      result = await chat.sendMessageStream(prompt);
    } catch (err) {
      logger.error(
        {
          err,
          geminiStatus: (err as Record<string, unknown>).status,
          geminiErrorDetails: (err as Record<string, unknown>).errorDetails,
        },
        "Gemini streamBreakdown failed",
      );
      throw err;
    }

    try {
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) yield text;
      }
    } catch (err) {
      logger.error({ err }, "Gemini streamBreakdown stream iteration failed");
      throw err;
    }
  }
}

/**
 * Build the rich project-context system prompt injected into every Gemini chat call.
 *
 * Accepts a RichProjectContext assembled by context-builder.service.ts — includes
 * overdue analysis, recent activity, plan summary, and team data so the AI can
 * answer questions about blockers, workload, and sprint planning accurately.
 */
export function buildSystemPrompt(ctx: RichProjectContext): string {
  const total = ctx.tasks.length;
  const pct = total > 0 ? Math.round((ctx.tasksByStatus.done / total) * 100) : 0;

  // ── Task list (sorted: IN_PROGRESS → TODO → REVIEW → DONE, by priority) ──────
  const taskLines =
    total === 0
      ? "  (no tasks yet — the board is empty)"
      : ctx.tasks
          .map((t) => {
            const due = t.dueDate
              ? ` | due ${new Date(t.dueDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}`
              : "";
            const desc = t.description ? `: ${t.description.slice(0, 80)}` : "";
            return `  - [${t.status}] ${t.title} (${t.priority})${due}${desc}`;
          })
          .join("\n");

  // ── Overdue section ──────────────────────────────────────────────────────────
  const overdueLines =
    ctx.overdueTasks.length === 0
      ? "  ✅ No overdue tasks"
      : ctx.overdueTasks
          .map((t) => `  - ${t.title} (${t.priority}) — ${t.daysOverdue}d overdue`)
          .join("\n");

  // ── Urgent & high-priority backlog ────────────────────────────────────────────
  const urgentLines =
    ctx.urgentTasks.length === 0
      ? "  ✅ No urgent or high-priority tasks pending"
      : ctx.urgentTasks
          .map((t) => {
            const due = t.dueDate
              ? ` (due ${new Date(t.dueDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })})`
              : "";
            return `  - [${t.status}] ${t.title}${due}`;
          })
          .join("\n");

  // ── Recent activity ──────────────────────────────────────────────────────────
  const activityLines =
    ctx.recentActivity.length === 0
      ? "  No activity in the last 24 hours"
      : ctx.recentActivity
          .slice(0, 10)
          .map((a) => {
            const meta = a.metadata as { taskTitle?: string; newStatus?: string } | null;
            const target = meta?.taskTitle ? ` on "${meta.taskTitle}"` : "";
            const extra = meta?.newStatus ? ` → ${meta.newStatus}` : "";
            const when = new Date(a.createdAt).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            });
            return `  - ${when} — ${a.actorName} ${formatActivityType(a.type)}${target}${extra}`;
          })
          .join("\n");

  // ── Team ─────────────────────────────────────────────────────────────────────
  const teamLine =
    ctx.teamMembers.length === 0
      ? "Solo project (no workspace members)"
      : ctx.teamMembers.join(", ");

  return `You are ContextOS AI — the intelligent workspace assistant for "${ctx.name}".
${ctx.description ? `\nProject: ${ctx.description}\n` : ""}
## 📋 Task Board  (${total} tasks | ${pct}% complete)
Status: TODO ${ctx.tasksByStatus.todo} · IN_PROGRESS ${ctx.tasksByStatus.inProgress} · REVIEW ${ctx.tasksByStatus.review} · DONE ${ctx.tasksByStatus.done}

### All Tasks (ordered: in-progress → todo → review → done, by priority within each status)
${taskLines}

## ⚠️  Overdue Tasks (${ctx.overdueTasks.length})
${overdueLines}

## 🔥  Urgent & High Priority Backlog
${urgentLines}

## 📅  Recent Activity (last 24 h)
${activityLines}

## 🗺️  Project Plan
${ctx.planSummary ?? "No AI plan generated yet. Direct user to the Planner tab."}

## 👥  Team
${teamLine}

---
## Your Role as ContextOS AI
You are an expert project manager and productivity assistant with full, real-time knowledge of the task board above.

Answer questions precisely using the data provided:
- "What should I work on next?" → prioritise URGENT/HIGH IN_PROGRESS first, then due-date proximity
- "Which tasks are blocked?" → IN_PROGRESS tasks with no recent activity, or explicitly stalled work
- "Summarize today's progress" → use recent activity events + DONE task count
- "Create a sprint plan" → pick from TODO (URGENT→HIGH→MEDIUM), respect due dates and realistic capacity
- "What is slowing this project?" → overdue tasks, stalled IN_PROGRESS, long REVIEW queues, no recent activity
- "Generate a 2-week roadmap" → sequence by priority → dependency → effort
- "Break this task into subtasks" → ask which task if ambiguous, then generate 4–6 specific subtasks

Output rules (follow every time):
- **Default response: under 200 words.** Only go longer if the user explicitly asks for details or a full plan.
- **Lead with the answer.** Never start with "Great question" or filler preamble — give the answer first.
- Use bullet lists for 3+ items; bold the most critical points.
- When listing tasks, show at most 5 by default and offer "show more" if there are additional items.
- Reference tasks by their EXACT titles (copy/paste from the board above).
- Never invent tasks, dates, or metrics not present in the data above.
- If asked about something outside the project data, say so in one sentence.
- For plans/roadmaps, format as a numbered list ordered by execution sequence.`;
}

function formatActivityType(type: string): string {
  const map: Record<string, string> = {
    TASK_CREATED: "created a task",
    TASK_UPDATED: "updated a task",
    TASK_STATUS_CHANGED: "changed task status",
    TASK_ASSIGNED: "assigned a task",
    TASK_COMMENTED: "commented",
    TASK_COMPLETED: "completed a task",
    PROJECT_CREATED: "created the project",
    MEMBER_JOINED: "joined the workspace",
    MEMBER_INVITED: "invited a member",
    MEMBER_REMOVED: "removed a member",
  };
  return map[type] ?? type.toLowerCase().replace(/_/g, " ");
}
