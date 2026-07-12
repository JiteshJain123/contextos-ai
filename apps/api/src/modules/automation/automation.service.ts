import { prisma, type InsightSeverity, type InsightType } from "@contextos-ai/database";

import { NotFoundError } from "../../lib/http-errors.js";
import { automationRepository } from "./automation.repository.js";

export type DetectionResult = {
  type: InsightType;
  severity: InsightSeverity;
  triggerReason: string;
  confidence: number;
  shouldGenerate: boolean;
};

// ── Detection thresholds ───────────────────────────────────────────────────────

const INACTIVE_WARNING_DAYS = 3;
const INACTIVE_CRITICAL_DAYS = 7;
const STALE_WARNING_DAYS = 5;
const STALE_CRITICAL_DAYS = 10;
const OVERDUE_WARNING_COUNT = 2;
const OVERDUE_CRITICAL_COUNT = 5;
const REVIEW_BLOCKED_DAYS = 2;
const REVIEW_BLOCKED_CRITICAL = 4;
const PROGRESS_FROZEN_DAYS = 3;
const SLOWDOWN_WARNING_PCT = 20;  // 20% velocity drop
const SLOWDOWN_CRITICAL_PCT = 50; // 50% velocity drop

export const automationService = {
  async detectTriggers(projectId: string, userId: string): Promise<DetectionResult[]> {
    const project = await prisma.project.findFirst({
      where: { id: projectId, ownerId: userId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!project) throw new NotFoundError("Project not found");

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const tasks = await prisma.task.findMany({
      where: { projectId, deletedAt: null },
      select: { status: true, priority: true, dueDate: true, updatedAt: true },
    });

    const activeTasks = tasks.filter((t) => t.status !== "DONE");
    const doneTasks = tasks.filter((t) => t.status === "DONE");
    const overdueTasks = activeTasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < now,
    );
    const reviewTasks = tasks.filter((t) => t.status === "REVIEW");
    const inProgressTasks = tasks.filter((t) => t.status === "IN_PROGRESS");

    const completedThisWeek = doneTasks.filter((t) => t.updatedAt > weekAgo).length;
    const completedLastWeek = doneTasks.filter(
      (t) => t.updatedAt > twoWeeksAgo && t.updatedAt <= weekAgo,
    ).length;

    // Most recent task update across all tasks
    const lastUpdate = tasks.reduce(
      (latest, t) => (t.updatedAt > latest ? t.updatedAt : latest),
      new Date(0),
    );
    const daysSinceUpdate = Math.floor(
      (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Existing insights — check when they were last regenerated
    const existingInsights = await prisma.aiInsight.findMany({
      where: { projectId },
      select: { type: true, updatedAt: true, dismissedAt: true },
    });
    const lastInsightUpdate = existingInsights.reduce(
      (latest, i) => (i.updatedAt > latest ? i.updatedAt : latest),
      new Date(0),
    );
    const daysSinceInsight = Math.floor(
      (now.getTime() - lastInsightUpdate.getTime()) / (1000 * 60 * 60 * 24),
    );

    const results: DetectionResult[] = [];

    // 1. OVERDUE_RECOVERY
    if (overdueTasks.length >= OVERDUE_WARNING_COUNT) {
      const hasUrgent = overdueTasks.some((t) =>
        ["URGENT", "HIGH"].includes(t.priority),
      );
      const severity: InsightSeverity =
        overdueTasks.length >= OVERDUE_CRITICAL_COUNT || hasUrgent
          ? "CRITICAL"
          : "WARNING";
      results.push({
        type: "OVERDUE_RECOVERY",
        severity,
        triggerReason: `${overdueTasks.length} tasks are overdue (${hasUrgent ? "including urgent/high priority" : "medium/low priority"})`,
        confidence: Math.min(0.95, 0.6 + overdueTasks.length * 0.07),
        shouldGenerate: true,
      });
    }

    // 2. INACTIVE_PROJECT
    if (tasks.length > 0 && daysSinceUpdate >= INACTIVE_WARNING_DAYS) {
      const severity: InsightSeverity =
        daysSinceUpdate >= INACTIVE_CRITICAL_DAYS ? "CRITICAL" : "WARNING";
      results.push({
        type: "INACTIVE_PROJECT",
        severity,
        triggerReason: `No task activity for ${daysSinceUpdate} day${daysSinceUpdate === 1 ? "" : "s"}`,
        confidence: Math.min(0.9, 0.5 + daysSinceUpdate * 0.05),
        shouldGenerate: true,
      });
    }

    // 3. BLOCKED_WORKFLOW
    const longInReview = reviewTasks.filter(
      (t) =>
        (now.getTime() - t.updatedAt.getTime()) / (1000 * 60 * 60 * 24) >
        REVIEW_BLOCKED_DAYS,
    ).length;
    const frozenInProgress = inProgressTasks.filter(
      (t) =>
        (now.getTime() - t.updatedAt.getTime()) / (1000 * 60 * 60 * 24) >
        PROGRESS_FROZEN_DAYS,
    ).length;

    if (longInReview >= 2 || frozenInProgress >= 2) {
      const severity: InsightSeverity =
        longInReview >= REVIEW_BLOCKED_CRITICAL || frozenInProgress >= 3
          ? "CRITICAL"
          : "WARNING";
      results.push({
        type: "BLOCKED_WORKFLOW",
        severity,
        triggerReason: `${longInReview} tasks stuck in review · ${frozenInProgress} tasks frozen in progress`,
        confidence: 0.8,
        shouldGenerate: true,
      });
    }

    // 4. PRODUCTIVITY_SLOWDOWN
    if (completedLastWeek > 0) {
      const dropPct =
        ((completedLastWeek - completedThisWeek) / completedLastWeek) * 100;
      if (dropPct >= SLOWDOWN_WARNING_PCT) {
        const severity: InsightSeverity =
          dropPct >= SLOWDOWN_CRITICAL_PCT || completedThisWeek === 0
            ? "CRITICAL"
            : "WARNING";
        results.push({
          type: "PRODUCTIVITY_SLOWDOWN",
          severity,
          triggerReason: `Velocity dropped ${dropPct.toFixed(0)}% (${completedLastWeek} → ${completedThisWeek} tasks/week)`,
          confidence: Math.min(0.9, 0.55 + dropPct / 200),
          shouldGenerate: true,
        });
      }
    }

    // 5. SPRINT_RISK
    const urgentActive = activeTasks.filter((t) => t.priority === "URGENT").length;
    const highDueSoon = activeTasks.filter(
      (t) =>
        t.priority === "HIGH" &&
        t.dueDate &&
        new Date(t.dueDate) < new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    ).length;

    if (urgentActive >= 2 || (urgentActive >= 1 && overdueTasks.length >= 1)) {
      const severity: InsightSeverity =
        urgentActive >= 3 || (urgentActive > 0 && overdueTasks.length > 0)
          ? "CRITICAL"
          : "WARNING";
      results.push({
        type: "SPRINT_RISK",
        severity,
        triggerReason: `${urgentActive} urgent + ${highDueSoon} high-priority due this week`,
        confidence: 0.75 + urgentActive * 0.05,
        shouldGenerate: true,
      });
    }

    // 6. OVERLOAD_WARNING
    const urgentCount = activeTasks.filter((t) => t.priority === "URGENT").length;
    const highCount = activeTasks.filter((t) => t.priority === "HIGH").length;
    const totalActive = activeTasks.length;

    if (totalActive >= 10 && (urgentCount + highCount) / totalActive > 0.5) {
      const severity: InsightSeverity =
        overdueTasks.length >= 3 || (urgentCount + highCount) / totalActive > 0.7
          ? "CRITICAL"
          : "WARNING";
      results.push({
        type: "OVERLOAD_WARNING",
        severity,
        triggerReason: `${totalActive} active tasks — ${urgentCount + highCount} are urgent/high priority`,
        confidence: 0.7,
        shouldGenerate: true,
      });
    }

    // 7. STALE_CONTENT (insights haven't been refreshed)
    if (
      existingInsights.length > 0 &&
      daysSinceInsight >= STALE_WARNING_DAYS
    ) {
      const severity: InsightSeverity =
        daysSinceInsight >= STALE_CRITICAL_DAYS ? "CRITICAL" : "WARNING";
      results.push({
        type: "STALE_CONTENT",
        severity,
        triggerReason: `AI insights not refreshed for ${daysSinceInsight} day${daysSinceInsight === 1 ? "" : "s"}`,
        confidence: 0.65,
        shouldGenerate: true,
      });
    }

    // Record runs in history
    await Promise.all(
      results.map((r) =>
        automationRepository.record({
          projectId,
          insightType: r.type,
          triggerReason: r.triggerReason,
          severity: r.severity,
        }),
      ),
    );

    return results;
  },

  async listHistory(projectId: string, userId: string) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, ownerId: userId, deletedAt: null },
      select: { id: true },
    });
    if (!project) throw new NotFoundError("Project not found");

    return automationRepository.listForProject(projectId);
  },
};
