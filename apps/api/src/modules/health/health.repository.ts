import { prisma, type ProjectHealth } from "@contextos-ai/database";

type HealthBreakdown = {
  taskCompletion: number;
  overdueImpact: number;
  activityLevel: number;
  blockerCount: number;
};

export const healthRepository = {
  async upsert(data: {
    projectId: string;
    score: number;
    breakdown: HealthBreakdown;
  }): Promise<ProjectHealth> {
    return prisma.projectHealth.upsert({
      where: { projectId: data.projectId },
      create: {
        projectId: data.projectId,
        score: data.score,
        breakdown: data.breakdown as never,
      },
      update: {
        score: data.score,
        breakdown: data.breakdown as never,
      },
    });
  },

  async findByProject(projectId: string): Promise<ProjectHealth | null> {
    return prisma.projectHealth.findUnique({ where: { projectId } });
  },
};
