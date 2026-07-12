import { prisma, type ProjectPlan } from "@contextos-ai/database";
import type { UpdatePlanInput } from "@contextos-ai/validators/plan";

import type { AiProvider } from "../ai/ai.provider.js";
import { NotFoundError, ServiceUnavailableError } from "../../lib/http-errors.js";
import { logger } from "../../lib/logger.js";
import { planRepository } from "./plan.repository.js";

const TASKS_START = "TASKS_JSON_START";
const TASKS_END = "TASKS_JSON_END";

type PlanStreamEvent =
  | { type: "chunk"; content: string }
  | { type: "tasks_saved"; count: number }
  | { type: "done"; planId: string };

type SuggestedTaskRaw = {
  title: string;
  description?: string;
  priority?: string;
};

function buildPlanPrompt(projectName: string, description: string | null, goal: string): string {
  return [
    `You are a project planning AI for the project "${projectName}".`,
    description ? `Project description: ${description}` : "",
    ``,
    `The user wants to plan: "${goal}"`,
    ``,
    `Generate a complete, actionable project roadmap in markdown. Use this structure:`,
    `## Overview`,
    `One clear paragraph summarizing what this project will accomplish and why.`,
    ``,
    `## Milestones`,
    `Number each milestone. Under each milestone, list 2-4 specific tasks with checkboxes.`,
    ``,
    `## Timeline`,
    `Rough time estimates per milestone (e.g., "Week 1-2: ...").`,
    ``,
    `## Tech Stack & Resources`,
    `If applicable, list recommended technologies, tools, or resources.`,
    ``,
    `---`,
    `After the roadmap markdown, output a JSON block of actionable tasks to create in the project board.`,
    `These tasks should map to the milestones above — be specific and immediately actionable.`,
    ``,
    `${TASKS_START}`,
    `[`,
    `  {"title": "Task title here", "description": "Optional brief description", "priority": "HIGH"},`,
    `  ...`,
    `]`,
    `${TASKS_END}`,
    ``,
    `Rules for the JSON block:`,
    `- Generate 5 to 10 tasks`,
    `- title: required, max 100 chars`,
    `- description: optional, max 200 chars`,
    `- priority: must be exactly LOW, MEDIUM, HIGH, or URGENT`,
    `- Output ONLY valid JSON inside the delimiters — no markdown fences`,
  ]
    .filter((line) => line !== undefined)
    .join("\n");
}

function parseTasks(fullContent: string): SuggestedTaskRaw[] {
  try {
    const start = fullContent.indexOf(TASKS_START);
    const end = fullContent.indexOf(TASKS_END);
    if (start === -1 || end === -1 || end <= start) return [];

    const raw = fullContent.slice(start + TASKS_START.length, end).trim();
    const cleaned = raw.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
    const parsed = JSON.parse(cleaned) as unknown[];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (t): t is Record<string, unknown> =>
          typeof t === "object" && t !== null && typeof (t as Record<string, unknown>).title === "string",
      )
      .slice(0, 10)
      .map((t) => ({
        title: String(t.title).slice(0, 100),
        description: t.description ? String(t.description).slice(0, 200) : undefined,
        priority: (["LOW", "MEDIUM", "HIGH", "URGENT"] as const).includes(t.priority as never)
          ? (t.priority as SuggestedTaskRaw["priority"])
          : "MEDIUM",
      }));
  } catch (err) {
    logger.warn({ err }, "plan: failed to parse task JSON from AI response");
    return [];
  }
}

function stripTasksBlock(markdown: string): string {
  const start = markdown.indexOf(TASKS_START);
  if (start === -1) return markdown;
  return markdown.slice(0, start).trimEnd();
}

export function createPlanService(provider: AiProvider) {
  return {
    async getPlan(projectId: string, userId: string): Promise<ProjectPlan | null> {
      await requireProject(projectId, userId);
      return planRepository.findByProject(projectId, userId);
    },

    async updatePlan(
      projectId: string,
      userId: string,
      data: UpdatePlanInput,
    ): Promise<ProjectPlan> {
      const updated = await planRepository.update(projectId, userId, data);
      if (!updated) throw new NotFoundError("No plan found for this project");
      return updated;
    },

    async deletePlan(projectId: string, userId: string): Promise<void> {
      const count = await planRepository.delete(projectId, userId);
      if (count === 0) throw new NotFoundError("No plan found for this project");
    },

    async *generatePlan(
      projectId: string,
      userId: string,
      goal: string,
    ): AsyncGenerator<PlanStreamEvent, void, undefined> {
      const project = await prisma.project.findFirst({
        where: { id: projectId, ownerId: userId, deletedAt: null },
        select: { name: true, description: true },
      });
      if (!project) throw new NotFoundError("Project not found");

      const systemPrompt = buildPlanPrompt(project.name, project.description, goal);

      let fullContent = "";

      try {
        const generator = provider.streamChat({
          history: [],
          userMessage: goal,
          systemPrompt,
        });

        let iterResult = await generator.next();
        while (!iterResult.done) {
          const chunk = iterResult.value as string;
          fullContent += chunk;
          yield { type: "chunk", content: chunk };
          iterResult = await generator.next();
        }
      } catch (err) {
        logger.error(
          {
            err,
            projectId,
            geminiStatus: (err as Record<string, unknown>).status,
            geminiErrorDetails: (err as Record<string, unknown>).errorDetails,
          },
          "plan: AI stream failed",
        );
        throw new ServiceUnavailableError(
          "AI provider error — check server logs",
        );
      }

      // Parse and create tasks from the embedded JSON block.
      const tasks = parseTasks(fullContent);
      if (tasks.length > 0) {
        const maxPos = await prisma.task.aggregate({
          where: { projectId, deletedAt: null },
          _max: { position: true },
        });
        let position = (maxPos._max.position ?? 0) + 1;

        await prisma.task.createMany({
          data: tasks.map((t) => ({
            projectId,
            createdById: userId,
            title: t.title,
            description: t.description ?? null,
            status: "TODO" as const,
            priority: (t.priority ?? "MEDIUM") as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
            position: position++,
          })),
        });
      }

      yield { type: "tasks_saved", count: tasks.length };

      // Strip the task JSON block from the stored markdown.
      const cleanMarkdown = stripTasksBlock(fullContent);

      const plan = await planRepository.upsert({
        projectId,
        goal,
        markdown: cleanMarkdown,
        tasksJson: tasks,
        metadata: { generatedAt: new Date().toISOString(), taskCount: tasks.length },
      });

      yield { type: "done", planId: plan.id };
    },
  };
}

async function requireProject(projectId: string, userId: string): Promise<void> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: userId, deletedAt: null },
    select: { id: true },
  });
  if (!project) throw new NotFoundError("Project not found");
}
