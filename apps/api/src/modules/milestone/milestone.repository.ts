import { prisma } from "@contextos-ai/database";
import type { CreateMilestoneInput, UpdateMilestoneInput } from "@contextos-ai/validators/milestone";

const PROJECT_ACCESS = (userId: string) => ({
  deletedAt: null as null,
  ownerId: userId,
});

export const milestoneRepository = {
  async projectExistsForUser(projectId: string, userId: string): Promise<boolean> {
    const project = await prisma.project.findFirst({
      where: { id: projectId, ...PROJECT_ACCESS(userId) },
      select: { id: true },
    });
    return project !== null;
  },

  async listForProject(projectId: string, userId: string) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, ...PROJECT_ACCESS(userId) },
      select: { id: true },
    });
    if (!project) return null;

    return prisma.projectMilestone.findMany({
      where: { projectId },
      orderBy: { targetDate: "asc" },
    });
  },

  async findByIdForUser(milestoneId: string, userId: string) {
    return prisma.projectMilestone.findFirst({
      where: {
        id: milestoneId,
        project: PROJECT_ACCESS(userId),
      },
    });
  },

  async create(projectId: string, input: CreateMilestoneInput) {
    return prisma.projectMilestone.create({
      data: {
        projectId,
        title: input.title,
        description: input.description ?? null,
        targetDate: input.targetDate,
      },
    });
  },

  async update(milestoneId: string, userId: string, input: UpdateMilestoneInput) {
    const existing = await this.findByIdForUser(milestoneId, userId);
    if (!existing) return null;

    const completedAt =
      input.completed === true && !existing.completed
        ? new Date()
        : input.completed === false
          ? null
          : existing.completedAt;

    return prisma.projectMilestone.update({
      where: { id: milestoneId },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.targetDate !== undefined && { targetDate: input.targetDate }),
        ...(input.completed !== undefined && {
          completed: input.completed,
          completedAt,
        }),
      },
    });
  },

  async delete(milestoneId: string, userId: string): Promise<boolean> {
    const existing = await this.findByIdForUser(milestoneId, userId);
    if (!existing) return false;

    await prisma.projectMilestone.delete({ where: { id: milestoneId } });
    return true;
  },
};
