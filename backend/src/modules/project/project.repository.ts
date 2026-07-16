import { prisma, type Project } from "@/database";

/**
 * Data-access layer for projects.
 *
 * SECURITY-CRITICAL: every query that touches a project takes a `userId` and
 * scopes by `ownerId`. There is intentionally no `findById(id)` method — a
 * stray controller using it would be a data leak.
 */

type ListParams = {
  page: number;
  pageSize: number;
  sortOrder: "asc" | "desc";
};

export type ProjectWithStats = Project & {
  taskCount: number;
  doneTaskCount: number;
  overdueTaskCount: number;
};

export const projectRepository = {
  async listForUser(
    userId: string,
    params: ListParams,
  ): Promise<{ items: ProjectWithStats[]; total: number }> {
    const { page, pageSize, sortOrder } = params;
    const where = { deletedAt: null, ownerId: userId };
    const now = new Date();

    const [rawItems, total] = await Promise.all([
      prisma.project.findMany({
        where,
        orderBy: { createdAt: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.project.count({ where }),
    ]);

    if (rawItems.length === 0) return { items: [], total };

    const projectIds = rawItems.map((p) => p.id);

    // Batch fetch task counts per project in parallel
    const [totalGroups, doneGroups, overdueGroups] = await Promise.all([
      prisma.task.groupBy({
        by: ["projectId"],
        where: { projectId: { in: projectIds }, deletedAt: null },
        _count: { _all: true },
      }),
      prisma.task.groupBy({
        by: ["projectId"],
        where: { projectId: { in: projectIds }, deletedAt: null, status: "DONE" },
        _count: { _all: true },
      }),
      prisma.task.groupBy({
        by: ["projectId"],
        where: {
          projectId: { in: projectIds },
          deletedAt: null,
          status: { not: "DONE" },
          dueDate: { lt: now },
        },
        _count: { _all: true },
      }),
    ]);

    const totalByProject = new Map(totalGroups.map((g) => [g.projectId, g._count._all]));
    const doneByProject = new Map(doneGroups.map((g) => [g.projectId, g._count._all]));
    const overdueByProject = new Map(overdueGroups.map((g) => [g.projectId, g._count._all]));

    const items: ProjectWithStats[] = rawItems.map((p) => ({
      ...p,
      taskCount: totalByProject.get(p.id) ?? 0,
      doneTaskCount: doneByProject.get(p.id) ?? 0,
      overdueTaskCount: overdueByProject.get(p.id) ?? 0,
    }));

    return { items, total };
  },

  async findByIdForUser(id: string, userId: string): Promise<Project | null> {
    return prisma.project.findFirst({
      where: { id, ownerId: userId, deletedAt: null },
    });
  },

  async findByIdWithAccess(id: string, userId: string): Promise<Project | null> {
    return prisma.project.findFirst({
      where: { id, ownerId: userId, deletedAt: null },
    });
  },

  async findBySlugForUser(slug: string, userId: string): Promise<Project | null> {
    return prisma.project.findFirst({
      where: { slug, ownerId: userId, deletedAt: null },
    });
  },

  async findBySlugWithAccess(slug: string, userId: string): Promise<Project | null> {
    return prisma.project.findFirst({
      where: { slug, ownerId: userId, deletedAt: null },
    });
  },

  async create(input: {
    ownerId: string;
    name: string;
    slug: string;
    description?: string;
  }): Promise<Project> {
    return prisma.project.create({
      data: {
        ownerId: input.ownerId,
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
      },
    });
  },

  async update(
    id: string,
    userId: string,
    input: { name?: string; slug?: string; description?: string },
  ): Promise<Project | null> {
    const result = await prisma.project.updateMany({
      where: { id, ownerId: userId, deletedAt: null },
      data: input,
    });
    if (result.count === 0) return null;
    return this.findByIdForUser(id, userId);
  },

  async getDashboardStats(userId: string): Promise<{
    projectCount: number;
    tasksByStatus: Record<"TODO" | "IN_PROGRESS" | "REVIEW" | "DONE", number>;
    tasksByPriority: Record<"LOW" | "MEDIUM" | "HIGH" | "URGENT", number>;
    overdueCount: number;
    avgHealthScore: number;
    overdueMilestoneCount: number;
    completionTrend: Array<{ label: string; completed: number }>;
    recentTasks: Array<{
      id: string;
      title: string;
      status: string;
      priority: string;
      updatedAt: Date;
      projectName: string;
      projectSlug: string;
    }>;
  }> {
    const now = new Date();
    const sixWeeksAgo = new Date(now.getTime() - 6 * 7 * 24 * 60 * 60 * 1000);
    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

    const [
      projectCount,
      statusGroups,
      priorityGroups,
      overdueCount,
      healthRecords,
      overdueMilestoneCount,
      recentlyCompleted,
      recentTasksRaw,
    ] = await Promise.all([
      prisma.project.count({ where: { ownerId: userId, deletedAt: null } }),
      prisma.task.groupBy({
        by: ["status"],
        where: { project: { ownerId: userId, deletedAt: null }, deletedAt: null },
        _count: { _all: true },
      }),
      prisma.task.groupBy({
        by: ["priority"],
        where: { project: { ownerId: userId, deletedAt: null }, deletedAt: null },
        _count: { _all: true },
      }),
      prisma.task.count({
        where: {
          project: { ownerId: userId, deletedAt: null },
          deletedAt: null,
          status: { not: "DONE" },
          dueDate: { lt: now },
        },
      }),
      prisma.projectHealth.findMany({
        where: { project: { ownerId: userId, deletedAt: null } },
        select: { score: true },
      }),
      prisma.projectMilestone.count({
        where: {
          project: { ownerId: userId, deletedAt: null },
          completed: false,
          targetDate: { lt: now },
        },
      }),
      prisma.task.findMany({
        where: {
          project: { ownerId: userId, deletedAt: null },
          deletedAt: null,
          status: "DONE",
          updatedAt: { gte: sixWeeksAgo },
        },
        select: { updatedAt: true },
      }),
      // Recent work feed — last 6 tasks touched across all projects
      prisma.task.findMany({
        where: { project: { ownerId: userId, deletedAt: null }, deletedAt: null },
        orderBy: { updatedAt: "desc" },
        take: 6,
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          updatedAt: true,
          project: { select: { name: true, slug: true } },
        },
      }),
    ]);

    const tasksByStatus: Record<"TODO" | "IN_PROGRESS" | "REVIEW" | "DONE", number> = {
      TODO: 0, IN_PROGRESS: 0, REVIEW: 0, DONE: 0,
    };
    for (const g of statusGroups) {
      tasksByStatus[g.status as keyof typeof tasksByStatus] = g._count._all;
    }

    const tasksByPriority: Record<"LOW" | "MEDIUM" | "HIGH" | "URGENT", number> = {
      LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0,
    };
    for (const g of priorityGroups) {
      tasksByPriority[g.priority as keyof typeof tasksByPriority] = g._count._all;
    }

    const avgHealthScore =
      healthRecords.length > 0
        ? Math.round(healthRecords.reduce((a, b) => a + b.score, 0) / healthRecords.length)
        : 0;

    // Bucket completed tasks into 6 weekly slots (index 0 = oldest, 5 = current week)
    const buckets = new Array<number>(6).fill(0);
    for (const task of recentlyCompleted) {
      const weeksAgo = Math.floor((now.getTime() - task.updatedAt.getTime()) / WEEK_MS);
      const slot = Math.min(5, Math.max(0, 5 - weeksAgo));
      buckets[slot] = (buckets[slot] ?? 0) + 1;
    }
    const completionTrend = buckets.map((completed, i) => ({
      label: i === 5 ? "This wk" : `${5 - i}w ago`,
      completed,
    }));

    const recentTasks = recentTasksRaw.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      updatedAt: t.updatedAt,
      projectName: t.project.name,
      projectSlug: t.project.slug,
    }));

    return {
      projectCount,
      tasksByStatus,
      tasksByPriority,
      overdueCount,
      avgHealthScore,
      overdueMilestoneCount,
      completionTrend,
      recentTasks,
    };
  },

  async softDelete(id: string, userId: string): Promise<number> {
    const result = await prisma.project.updateMany({
      where: { id, ownerId: userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return result.count;
  },
};
