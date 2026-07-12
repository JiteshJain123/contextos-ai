import { prisma, type ProjectPlan } from "@contextos-ai/database";

type PlanUpsertData = {
  projectId: string;
  goal: string;
  markdown: string;
  tasksJson: unknown;
  metadata?: unknown;
};

export const planRepository = {
  async findByProject(projectId: string, userId: string): Promise<ProjectPlan | null> {
    return prisma.projectPlan.findFirst({
      where: {
        projectId,
        project: { ownerId: userId, deletedAt: null },
      },
    });
  },

  async upsert(data: PlanUpsertData): Promise<ProjectPlan> {
    return prisma.projectPlan.upsert({
      where: { projectId: data.projectId },
      create: {
        projectId: data.projectId,
        goal: data.goal,
        markdown: data.markdown,
        tasksJson: data.tasksJson as never,
        metadata: (data.metadata as never) ?? undefined,
      },
      update: {
        goal: data.goal,
        markdown: data.markdown,
        tasksJson: data.tasksJson as never,
        metadata: (data.metadata as never) ?? undefined,
      },
    });
  },

  async update(
    projectId: string,
    userId: string,
    data: { markdown?: string; goal?: string },
  ): Promise<ProjectPlan | null> {
    const existing = await this.findByProject(projectId, userId);
    if (!existing) return null;
    return prisma.projectPlan.update({
      where: { id: existing.id },
      data,
    });
  },

  async delete(projectId: string, userId: string): Promise<number> {
    const existing = await this.findByProject(projectId, userId);
    if (!existing) return 0;
    await prisma.projectPlan.delete({ where: { id: existing.id } });
    return 1;
  },
};
