/**
 * prompt-builder.service.ts
 *
 * Builds the production system prompt from all available project context:
 * tasks, overdue analysis, documents, AI insights, plan, activity, and RAG memory.
 *
 * Design: each section is assembled as an array of strings joined with "\n"
 * to keep template literals shallow and the code easy to maintain.
 */

import type { ContextSource } from "@contextos-ai/validators/ai";
import type { RagContext } from "@contextos-ai/validators/memory";
import type { RichProjectContext } from "./ai.types.js";

// ── Constants ──────────────────────────────────────────────────────────────────

export const STATUS_ICON: Record<string, string> = {
  IN_PROGRESS: "🔄",
  REVIEW: "👀",
  TODO: "📝",
  DONE: "✅",
};

export const PRIORITY_ICON: Record<string, string> = {
  URGENT: "🚨",
  HIGH: "🔴",
  MEDIUM: "🟡",
  LOW: "⚪",
};

export const SEVERITY_ICON: Record<string, string> = {
  CRITICAL: "🔴",
  HIGH: "🟠",
  MEDIUM: "🟡",
  LOW: "🟢",
  INFO: "ℹ️",
};

const DIVIDER = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";

const EMPTY_RAG: RagContext = { contextText: "", chunksUsed: 0, sources: [] };

// ── Helpers ────────────────────────────────────────────────────────────────────

export function fmtDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function fmtActivityLabel(type: string): string {
  const labels: Record<string, string> = {
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
  return labels[type] ?? type.toLowerCase().replace(/_/g, " ");
}

/** Wrap content in a titled divider block. */
function block(title: string, content: string): string {
  return [DIVIDER, title, DIVIDER, content].join("\n");
}

// ── Section builders ───────────────────────────────────────────────────────────

function buildHeader(ctx: RichProjectContext): string {
  const lines = [
    `You are ContextOS AI — the intelligent project operating system for "${ctx.name}".`,
    "You have real-time awareness of every task, document, insight, and conversation in this project.",
  ];
  if (ctx.description) {
    lines.push("", `Project description: ${ctx.description}`);
  }
  return lines.join("\n");
}

function buildStats(ctx: RichProjectContext): string {
  const total = ctx.tasks.length;
  const pct = total > 0 ? Math.round((ctx.tasksByStatus.done / total) * 100) : 0;
  const docCount = (ctx.documents ?? []).length;
  const insightCount = (ctx.insights ?? []).length;
  const team = ctx.teamMembers.length > 0 ? ctx.teamMembers.join(", ") : "Solo project";

  const content = [
    `Total tasks: ${total} | Completed: ${ctx.tasksByStatus.done} (${pct}%) | In Progress: ${ctx.tasksByStatus.inProgress} | Review: ${ctx.tasksByStatus.review} | Todo: ${ctx.tasksByStatus.todo}`,
    `Overdue: ${ctx.overdueTasks.length} | Documents: ${docCount} | AI Insights: ${insightCount}`,
    `Team: ${team}`,
  ].join("\n");

  return block("📊 PROJECT STATISTICS", content);
}

function buildOverdue(ctx: RichProjectContext): string {
  const content =
    ctx.overdueTasks.length === 0
      ? "✅ No overdue tasks"
      : ctx.overdueTasks
          .map((t) => {
            const pri = PRIORITY_ICON[t.priority] ?? "";
            return `  🚨 ${pri} "${t.title}" — ${t.daysOverdue}d overdue (${t.priority})`;
          })
          .join("\n");

  return block(`⚠️  OVERDUE TASKS (${ctx.overdueTasks.length}) — HIGHEST PRIORITY`, content);
}

function buildUrgent(ctx: RichProjectContext): string {
  const content =
    ctx.urgentTasks.length === 0
      ? "✅ No urgent or high-priority tasks pending"
      : ctx.urgentTasks
          .slice(0, 10)
          .map((t) => {
            const due = t.dueDate ? ` (due ${fmtDate(t.dueDate)})` : "";
            return `  🔥 [${t.status}] "${t.title}"${due}`;
          })
          .join("\n");

  return block("🔥 URGENT & HIGH PRIORITY BACKLOG", content);
}

function buildTaskBoard(ctx: RichProjectContext): string {
  const total = ctx.tasks.length;
  const content =
    total === 0
      ? "  (no tasks yet — the board is empty)"
      : ctx.tasks
          .slice(0, 60)
          .map((t) => {
            const icon = STATUS_ICON[t.status] ?? "•";
            const pri = PRIORITY_ICON[t.priority] ?? "";
            const due = t.dueDate ? ` | due ${fmtDate(t.dueDate)}` : "";
            const desc = t.description ? ` — ${t.description.slice(0, 80)}` : "";
            return `  ${icon} ${pri} [${t.status}] "${t.title}" (${t.priority})${due}${desc}`;
          })
          .join("\n");

  return block(`📋 FULL TASK BOARD (${total} tasks)`, content);
}

function buildDocuments(ctx: RichProjectContext): string {
  const documents = ctx.documents ?? [];
  const content =
    documents.length === 0
      ? "  (no documents uploaded)"
      : documents
          .map((d) => {
            const lines = [`  📄 [doc: "${d.title}"]`];
            if (d.summary) lines.push(`     Summary: ${d.summary.slice(0, 250)}`);
            if (d.requirementCount > 0) lines.push(`     Requirements: ${d.requirementCount} items extracted`);
            if (d.riskCount > 0) lines.push(`     Risks: ${d.riskCount} risks detected`);
            return lines.join("\n");
          })
          .join("\n");

  return block(`📄 PROJECT DOCUMENTS (${documents.length})`, content);
}

function buildInsights(ctx: RichProjectContext): string {
  const insights = ctx.insights ?? [];
  const content =
    insights.length === 0
      ? "  (no AI insights generated yet — run insights from the Insights tab)"
      : insights
          .slice(0, 10)
          .map((i) => {
            const icon = SEVERITY_ICON[i.severity] ?? "•";
            const preview = i.contentPreview.slice(0, 250).replace(/\n/g, " ");
            return [`  ${icon} [insight: ${i.type}] (${i.severity})`, `     ${preview}`].join("\n");
          })
          .join("\n");

  return block(`🧠 AI INSIGHTS (${insights.length})`, content);
}

function buildPlan(ctx: RichProjectContext): string {
  const raw = ctx.planSummary ?? "";
  const content = raw
    ? raw.slice(0, 600) + (raw.length > 600 ? "…" : "")
    : "  No AI plan generated yet — direct the user to the Planner tab.";

  return block("🗺️  PROJECT PLAN", content);
}

function buildActivity(ctx: RichProjectContext): string {
  const content =
    ctx.recentActivity.length === 0
      ? "  No activity in the last 24 h"
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
            return `  ${when} — ${a.actorName} ${fmtActivityLabel(a.type)}${target}${extra}`;
          })
          .join("\n");

  return block("📅 RECENT ACTIVITY (last 24 h)", content);
}

function buildRag(rag: RagContext): string {
  if (rag.chunksUsed === 0) return "";
  return block(
    `🔍 RETRIEVED MEMORY (${rag.chunksUsed} relevant chunks from project knowledge base)`,
    rag.contextText,
  );
}

function buildInstructions(): string {
  const content = [
    "You are an expert project manager and productivity coach.",
    "",
    "CITATION RULES (mandatory — never skip):",
    '  - Tasks: cite EXACT title in double quotes → "Setup Auth Middleware"',
    '  - Documents: cite by filename → [doc: "requirements.pdf"]',
    "  - Insights: cite by type → [insight: BLOCKER_CHAIN]",
    "  - Memory chunks: cite as → [memory: TASK|DOCUMENT|INSIGHT]",
    "  - Never invent tasks, dates, or metrics not present in the data above",
    "",
    "RESPONSE RULES:",
    "  - Always prioritize overdue tasks — they are the most critical finding",
    "  - Lead with the answer — never start with preamble or pleasantries",
    "  - Default: under 200 words unless the user asks for details or a full plan",
    "  - Use bullet lists for 3+ items; bold the most critical items",
    "  - Reference tasks by their EXACT titles (copy from the board above)",
    "  - For blockers: name the specific task + days overdue + downstream impact",
    "  - For sprint planning: order by URGENT → HIGH → MEDIUM, respect due dates",
    "  - For document questions: reference the exact document name and its extracted data",
    "  - For risk questions: check both document risks AND BLOCKER_CHAIN/DELAY_IMPACT insights",
    "  - If asked about something not in the project data, say so in one sentence",
    "  - NEVER refuse valid project actions (create task, update task, sprint planning, assignments)",
    "",
    "EXAMPLE RESPONSES:",
    '  - "What should I work on next?" → top IN_PROGRESS by priority, then overdue TODO tasks',
    '  - "What\'s blocked?" → overdue tasks + stalled IN_PROGRESS with no recent activity',
    '  - "Are there risks?" → document risk counts + relevant insights',
    '  - "Summarize progress" → completion % + done count + recent activity highlights',
    '  - "What are the requirements?" → reference uploaded documents by name',
  ].join("\n");

  return block("INSTRUCTIONS — FOLLOW EXACTLY", content);
}

// ── Main exports ───────────────────────────────────────────────────────────────

/**
 * Build the production system prompt for ContextOS AI chat.
 *
 * Sections (in priority order):
 *   1. Identity + project overview
 *   2. Project statistics
 *   3. Overdue tasks (critical)
 *   4. Urgent & high-priority backlog
 *   5. Full task board
 *   6. Project documents
 *   7. AI insights
 *   8. Project plan summary
 *   9. Recent activity
 *  10. RAG memory context
 *  11. Citation rules + response guidelines
 */
export function buildProductionSystemPrompt(
  ctx: RichProjectContext,
  rag: RagContext = EMPTY_RAG,
): string {
  return [
    buildHeader(ctx),
    buildStats(ctx),
    buildOverdue(ctx),
    buildUrgent(ctx),
    buildTaskBoard(ctx),
    buildDocuments(ctx),
    buildInsights(ctx),
    buildPlan(ctx),
    buildActivity(ctx),
    buildRag(rag),
    buildInstructions(),
  ]
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Build the context source list for the frontend "context loaded" strip.
 *
 * Each item describes one data source injected into the prompt,
 * with a count and display label for rendering as chips/badges.
 */
export function buildContextSources(
  ctx: RichProjectContext,
  rag: RagContext,
): ContextSource[] {
  const sources: ContextSource[] = [];
  const documents = ctx.documents ?? [];
  const insights = ctx.insights ?? [];

  if (ctx.tasks.length > 0) {
    sources.push({ type: "tasks", count: Math.min(ctx.tasks.length, 60), label: "Tasks" });
  }
  if (documents.length > 0) {
    sources.push({ type: "documents", count: documents.length, label: "Docs" });
  }
  if (insights.length > 0) {
    sources.push({ type: "insights", count: insights.length, label: "Insights" });
  }
  if (ctx.overdueTasks.length > 0) {
    sources.push({ type: "overdue", count: ctx.overdueTasks.length, label: "Overdue" });
  }
  if (ctx.planSummary) {
    sources.push({ type: "plan", count: 1, label: "Plan" });
  }
  if (rag.chunksUsed > 0) {
    sources.push({ type: "memory", count: rag.chunksUsed, label: "Memory" });
  }

  return sources;
}
