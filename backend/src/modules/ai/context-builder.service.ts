import { prisma } from "@/database";

import { logger } from "../../lib/logger.js";
import type { RichProjectContext } from "./ai.types.js";

const CACHE_TTL_MS = 5 * 60 * 1000;

const STATUS_ORDER: Record<string, number> = {
  IN_PROGRESS: 0,
  REVIEW: 1,
  TODO: 2,
  DONE: 3,
};
const PRIORITY_ORDER: Record<string, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

export async function buildRichContext(
  projectId: string,
  userId: string,
): Promise<RichProjectContext | null> {
  try {
    const cached = await prisma.aiContextCache.findUnique({ where: { projectId } });
    if (cached && Date.now() - cached.builtAt.getTime() < CACHE_TTL_MS) {
      return cached.data as unknown as RichProjectContext;
    }
  } catch (err) {
    logger.warn({ err, projectId }, "ai-context-cache: lookup failed, rebuilding");
  }

  const [project, tasks, plan, documents, insights] = await Promise.all([
    prisma.project.findFirst({
      where: { id: projectId, ownerId: userId, deletedAt: null },
      select: { name: true, description: true },
    }),
    prisma.task.findMany({
      where: { projectId, deletedAt: null },
      select: {
        title: true,
        status: true,
        priority: true,
        description: true,
        dueDate: true,
      },
    }),
    prisma.projectPlan.findUnique({
      where: { projectId },
      select: { goal: true, markdown: true },
    }),
    prisma.projectDocument.findMany({
      where: { projectId, deletedAt: null },
      select: {
        id: true,
        originalName: true,
        summary: true,
        requirementsJson: true,
        risksJson: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.aiInsight.findMany({
      where: { projectId },
      select: { type: true, severity: true, content: true },
      orderBy: { updatedAt: "desc" },
      take: 14,
    }),
  ]);

  if (!project) return null;

  const now = new Date();

  const sortedTasks = [...tasks].sort((a, b) => {
    const sd = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
    if (sd !== 0) return sd;
    return (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99);
  });

  const overdueTasks = sortedTasks
    .filter((t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "DONE")
    .map((t) => ({
      title: t.title,
      priority: t.priority,
      dueDate: t.dueDate!,
      daysOverdue: Math.floor((now.getTime() - new Date(t.dueDate!).getTime()) / 86_400_000),
    }));

  const urgentTasks = sortedTasks
    .filter((t) => (t.priority === "URGENT" || t.priority === "HIGH") && t.status !== "DONE")
    .slice(0, 15)
    .map((t) => ({ title: t.title, status: t.status, dueDate: t.dueDate ?? null }));

  const tasksByStatus = {
    todo: tasks.filter((t) => t.status === "TODO").length,
    inProgress: tasks.filter((t) => t.status === "IN_PROGRESS").length,
    review: tasks.filter((t) => t.status === "REVIEW").length,
    done: tasks.filter((t) => t.status === "DONE").length,
  };

  const planSummary = plan
    ? `Goal: ${plan.goal}\n${plan.markdown.slice(0, 400)}${plan.markdown.length > 400 ? "…" : ""}`
    : null;

  const context: RichProjectContext = {
    name: project.name,
    description: project.description,
    tasks: sortedTasks.slice(0, 60).map((t) => ({
      title: t.title,
      status: t.status,
      priority: t.priority,
      description: t.description,
      dueDate: t.dueDate ?? null,
    })),
    tasksByStatus,
    overdueTasks,
    urgentTasks,
    recentActivity: [],
    planSummary,
    teamMembers: [],
    documents: documents.map((d) => ({
      id: d.id,
      title: d.originalName,
      summary: d.summary,
      riskCount: Array.isArray(d.risksJson) ? (d.risksJson as unknown[]).length : 0,
      requirementCount: Array.isArray(d.requirementsJson) ? (d.requirementsJson as unknown[]).length : 0,
    })),
    insights: insights.map((i) => ({
      type: i.type,
      severity: i.severity,
      contentPreview: i.content.slice(0, 400),
    })),
  };

  prisma.aiContextCache
    .upsert({
      where: { projectId },
      update: { data: context as object, builtAt: new Date() },
      create: { projectId, data: context as object },
    })
    .catch((err: unknown) => {
      logger.warn({ err, projectId }, "ai-context-cache: write failed");
    });

  return context;
}
