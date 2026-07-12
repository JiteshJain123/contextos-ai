import { prisma, type Task } from "@contextos-ai/database";
import type { TaskPriority, TaskStatus } from "@contextos-ai/validators/task";

type TaskUpdate = {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  startDate?: Date | null;
  dueDate?: Date | null;
  position?: number;
};

const PROJECT_OWNED = (userId: string) => ({
  deletedAt: null as null,
  ownerId: userId,
});

export const taskRepository = {
  async projectExistsForUser(projectId: string, userId: string): Promise<boolean> {
    const project = await prisma.project.findFirst({
      where: { id: projectId, ...PROJECT_OWNED(userId) },
      select: { id: true },
    });
    return project !== null;
  },

  async listForProject(projectId: string, userId: string) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, ...PROJECT_OWNED(userId) },
      select: { id: true },
    });
    if (!project) return null;

    return prisma.task.findMany({
      where: { projectId, deletedAt: null },
      orderBy: [{ status: "asc" }, { position: "asc" }],
    });
  },

  async findByIdForUser(taskId: string, userId: string): Promise<Task | null> {
    return prisma.task.findFirst({
      where: {
        id: taskId,
        deletedAt: null,
        project: PROJECT_OWNED(userId),
      },
    });
  },

  async maxPositionIn(projectId: string, status: TaskStatus): Promise<number> {
    const row = await prisma.task.aggregate({
      where: { projectId, status, deletedAt: null },
      _max: { position: true },
    });
    return row._max.position ?? 0;
  },

  async create(input: {
    projectId: string;
    createdById: string;
    title: string;
    description?: string;
    status: TaskStatus;
    priority: TaskPriority;
    startDate?: Date;
    dueDate?: Date;
    position: number;
  }): Promise<Task> {
    return prisma.task.create({
      data: {
        projectId: input.projectId,
        createdById: input.createdById,
        title: input.title,
        description: input.description ?? null,
        status: input.status,
        priority: input.priority,
        startDate: input.startDate ?? null,
        dueDate: input.dueDate ?? null,
        position: input.position,
      },
    });
  },

  async createMany(
    items: Array<{
      projectId: string;
      createdById: string;
      title: string;
      description?: string;
      status: TaskStatus;
      priority: TaskPriority;
      startDate?: Date;
      dueDate?: Date;
      position: number;
    }>,
  ): Promise<Task[]> {
    return prisma.$transaction(
      items.map((item) =>
        prisma.task.create({
          data: {
            projectId: item.projectId,
            createdById: item.createdById,
            title: item.title,
            description: item.description ?? null,
            status: item.status,
            priority: item.priority,
            startDate: item.startDate ?? null,
            dueDate: item.dueDate ?? null,
            position: item.position,
          },
        }),
      ),
    );
  },

  async update(taskId: string, userId: string, input: TaskUpdate): Promise<Task | null> {
    await prisma.task.updateMany({
      where: { id: taskId, deletedAt: null, project: PROJECT_OWNED(userId) },
      data: input,
    });
    return this.findByIdForUser(taskId, userId);
  },

  async softDelete(taskId: string, userId: string): Promise<number> {
    const result = await prisma.task.updateMany({
      where: { id: taskId, deletedAt: null, project: PROJECT_OWNED(userId) },
      data: { deletedAt: new Date() },
    });
    return result.count;
  },
};
