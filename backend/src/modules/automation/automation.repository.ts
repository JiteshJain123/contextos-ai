import {
  prisma,
  type AutomationRun,
  type InsightType,
  type InsightSeverity,
} from "@/database";

export const automationRepository = {
  async record(data: {
    projectId: string;
    insightType: InsightType;
    triggerReason: string;
    severity: InsightSeverity;
  }): Promise<AutomationRun> {
    return prisma.automationRun.create({ data });
  },

  async listForProject(projectId: string, limit = 20): Promise<AutomationRun[]> {
    return prisma.automationRun.findMany({
      where: { projectId },
      orderBy: { triggeredAt: "desc" },
      take: limit,
    });
  },

  async countRecent(projectId: string, insightType: InsightType, hours = 24): Promise<number> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return prisma.automationRun.count({
      where: { projectId, insightType, triggeredAt: { gte: since } },
    });
  },
};
