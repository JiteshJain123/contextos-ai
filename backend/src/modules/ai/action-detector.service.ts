/**
 * action-detector.service.ts
 *
 * Analyzes a completed chat turn to detect if the user's message contains a
 * clear, explicit project-management action request.
 *
 * Makes a single non-streaming Gemini call AFTER the AI response has been
 * streamed — the user already has their answer; this runs in the background
 * and emits an `action` SSE event only when confident.
 *
 * Returns null when:
 *   - No action verbs present (fast filter, no Gemini call)
 *   - Gemini returns {"type":"none"}
 *   - Gemini returns invalid JSON or an unrecognised action type
 *   - Any network / quota error (best-effort, never blocks chat)
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

import { actionPayloadSchema } from "@/validators/ai-actions";
import type { ActionPayload } from "@/validators/ai-actions";

import { logger } from "../../lib/logger.js";
import type { RichProjectContext } from "./ai.types.js";

const GEMINI_MODEL = "gemini-2.0-flash-lite";

// Only attempt detection when the user message contains an action verb.
const ACTION_VERBS_RE =
  /\b(create|add|make|mark|move|change|update|assign|generate|build|set|break(?:\s+down)?|reprioritize|prioritize|bump)\b/i;

export async function detectAction(
  userMessage: string,
  context: RichProjectContext,
  apiKey: string,
): Promise<ActionPayload | null> {
  // Fast pre-filter: skip purely informational messages (no Gemini call)
  if (!ACTION_VERBS_RE.test(userMessage)) return null;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  // Build a compact task list (active only) for the AI to match against
  const activeTasks = context.tasks
    .filter((t) => t.status !== "DONE")
    .slice(0, 25)
    .map((t) => `- "${t.title}" [${t.status}] (${t.priority})`)
    .join("\n");

  const teamMembers =
    context.teamMembers.length > 0 ? context.teamMembers.join(", ") : "none";

  const prompt = [
    `You are detecting explicit project management action requests from chat messages.`,
    ``,
    `USER MESSAGE: "${userMessage}"`,
    ``,
    `ACTIVE TASKS:`,
    activeTasks || "  (none)",
    ``,
    `TEAM MEMBERS: ${teamMembers}`,
    ``,
    `TASK: If the user CLEARLY and EXPLICITLY requests one of the actions below,`,
    `return the matching JSON object. Otherwise return: {"type":"none"}`,
    ``,
    `Supported actions:`,
    ``,
    `create_task (user wants to add a new task):`,
    `{"type":"create_task","title":"<required, ≤200 chars>","description":"<optional>","priority":"LOW|MEDIUM|HIGH|URGENT","status":"TODO"}`,
    ``,
    `update_task_status (user wants to move a task):`,
    `{"type":"update_task_status","taskTitle":"<exact title from active tasks list>","newStatus":"TODO|IN_PROGRESS|REVIEW|DONE"}`,
    ``,
    `create_subtasks (user wants to break a task into smaller pieces):`,
    `{"type":"create_subtasks","parentTaskTitle":"<task title>","subtasks":[{"title":"...","priority":"MEDIUM"},{"title":"...","priority":"MEDIUM"}]}`,
    ``,
    `reprioritize_tasks (user wants to change priorities of existing tasks):`,
    `{"type":"reprioritize_tasks","changes":[{"taskTitle":"<exact title>","newPriority":"URGENT|HIGH|MEDIUM|LOW"}]}`,
    ``,
    `assign_task (user wants to assign a task to a team member):`,
    `{"type":"assign_task","taskTitle":"<exact title>","assigneeName":"<name from team>","assigneeEmail":"<email if given>"}`,
    ``,
    `generate_sprint_tasks (user wants AI to generate a batch of tasks for a goal):`,
    `{"type":"generate_sprint_tasks","goal":"<what to build, ≤500 chars>","taskCount":6}`,
    ``,
    `STRICT RULES — if any rule is violated, return {"type":"none"}:`,
    `1. Intent must be EXPLICIT: "create a task for auth" YES; "what tasks are left?" NO`,
    `2. For status/priority/assign actions: taskTitle must closely match an existing active task`,
    `3. Ambiguous or hypothetical requests: return {"type":"none"}`,
    `4. Do NOT invent assignee emails or task titles not mentioned in the message`,
    `5. Respond with ONLY valid JSON — no markdown fences, no explanation`,
  ].join("\n");

  try {
    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();
    const cleaned = raw
      .replace(/^```(?:json)?\n?/i, "")
      .replace(/\n?```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned) as unknown;
    if (typeof parsed !== "object" || parsed === null) return null;

    const obj = parsed as Record<string, unknown>;
    if (obj.type === "none") return null;

    const validated = actionPayloadSchema.safeParse(parsed);
    if (!validated.success) {
      logger.debug(
        { issues: validated.error.issues, raw: cleaned },
        "action-detector: invalid payload from Gemini",
      );
      return null;
    }

    logger.info(
      { actionType: validated.data.type },
      "action-detector: action detected",
    );
    return validated.data;
  } catch (err) {
    // Best-effort — log at debug level so it doesn't spam error logs
    logger.debug({ err }, "action-detector: detection failed (best-effort)");
    return null;
  }
}
