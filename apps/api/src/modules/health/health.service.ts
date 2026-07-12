import { prisma, type ProjectHealth } from "@contextos-ai/database";

import { NotFoundError } from "../../lib/http-errors.js";
import { healthRepository } from "./health.repository.js";

type HealthBreakdown = {
  taskCompletion: number;
  overdueImpact: number;
  activityLevel: number;
  blockerCount: number;
};

function clamp(n: number): number {
  return Math.round(Math.min(100, Math.max(0, n)));
}

function computeScore(breakdown: HealthBreakdown): number {
  // Weighted average: completion + overdue impact have higher weight
  const score =
    breakdown.taskCompletion * 0.35 +
    breakdown.overdueImpact * 0.3 +
    breakdown.activityLevel * 0.2 +
    breakdown.blockerCount * 0.15;
  return clamp(score);
}

export const healthService = {
  async computeAndStore(projectId: string, userId: string): Promise<ProjectHealth> {
    const project = await prisma.project.findFirst({
      where: { id: projectId, ownerId: userId, deletedAt: null },
      select: { id: true },
    });
    if (!project) throw new NotFoundError("Project not found");

    const tasks = await prisma.task.findMany({
      where: { projectId, deletedAt: null },
      select: { status: true, priority: true, dueDate: true, updatedAt: true },
    });

    if (tasks.length === 0) {
      const breakdown: HealthBreakdown = {
        taskCompletion: 50,
        overdueImpact: 100,
        activityLevel: 50,
        blockerCount: 100,
      };
      return healthRepository.upsert({
        projectId,
        score: 75,
        breakdown,
      });
    }

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const doneTasks = tasks.filter((t) => t.status === "DONE");
    const activeTasks = tasks.filter((t) => t.status !== "DONE");
    const overdueTasks = activeTasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < now,
    );
    const reviewTasks = tasks.filter((t) => t.status === "REVIEW");
    const inProgressTasks = tasks.filter((t) => t.status === "IN_PROGRESS");

    // 1. Task completion (0-100): done / total
    const taskCompletion = clamp((doneTasks.length / tasks.length) * 100);

    // 2. Overdue impact (0-100): 100 = no overdue, decreases by severity
    const overdueRatio = activeTasks.length > 0
      ? overdueTasks.length / activeTasks.length
      : 0;
    const urgentOverdue = overdueTasks.filter((t) =>
      ["URGENT", "HIGH"].includes(t.priority),
    ).length;
    const overdueImpact = clamp(
      100 - overdueRatio * 60 - urgentOverdue * 10,
    );

    // 3. Activity level (0-100): recent updates in last 7 days
    const recentActivity = tasks.filter((t) => t.updatedAt > weekAgo).length;
    const activityLevel = clamp(Math.min(100, (recentActivity / Math.max(1, tasks.length)) * 120));

    // 4. Blocker count (0-100): 100 = no blockers
    const frozenReview = reviewTasks.filter(
      (t) => (now.getTime() - t.updatedAt.getTime()) / (1000 * 60 * 60 * 24) > 2,
    ).length;
    const frozenProgress = inProgressTasks.filter(
      (t) => (now.getTime() - t.updatedAt.getTime()) / (1000 * 60 * 60 * 24) > 3,
    ).length;
    const blockerCount = clamp(100 - frozenReview * 15 - frozenProgress * 10);

    const breakdown: HealthBreakdown = {
      taskCompletion,
      overdueImpact,
      activityLevel,
      blockerCount,
    };

    return healthRepository.upsert({
      projectId,
      score: computeScore(breakdown),
      breakdown,
    });
  },

  async getHealth(projectId: string, userId: string): Promise<ProjectHealth> {
    const project = await prisma.project.findFirst({
      where: { id: projectId, ownerId: userId, deletedAt: null },
      select: { id: true },
    });
    if (!project) throw new NotFoundError("Project not found");

    const existing = await healthRepository.findByProject(projectId);
    if (existing) return existing;

    // Auto-compute if not yet stored
    return healthService.computeAndStore(projectId, userId);
  },
};
