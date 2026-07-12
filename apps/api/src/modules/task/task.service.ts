import type { Task } from "@contextos-ai/database";
import type {
  BatchCreateTasksInput,
  CreateTaskInput,
  TaskStatus,
  UpdateTaskInput,
  UpdateTaskStatusInput,
} from "@contextos-ai/validators/task";

import { NotFoundError } from "../../lib/http-errors.js";
import { taskRepository } from "./task.repository.js";

const POSITION_STEP = 1024;

export const taskService = {
  async list(projectId: string, userId: string): Promise<Task[]> {
    const tasks = await taskRepository.listForProject(projectId, userId);
    if (tasks === null) throw new NotFoundError("Project not found");
    return tasks;
  },

  async getById(taskId: string, userId: string): Promise<Task> {
    const task = await taskRepository.findByIdForUser(taskId, userId);
    if (!task) throw new NotFoundError("Task not found");
    return task;
  },

  async create(projectId: string, userId: string, input: CreateTaskInput): Promise<Task> {
    const projectExists = await taskRepository.projectExistsForUser(projectId, userId);
    if (!projectExists) throw new NotFoundError("Project not found");

    const position =
      input.position ??
      (await taskRepository.maxPositionIn(projectId, input.status)) + POSITION_STEP;

    const task = await taskRepository.create({
      projectId,
      createdById: userId,
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority,
      startDate: input.startDate,
      dueDate: input.dueDate,
      position,
    });

    return task;
  },

  async createBulk(projectId: string, userId: string, inputs: BatchCreateTasksInput["tasks"]): Promise<Task[]> {
    const projectExists = await taskRepository.projectExistsForUser(projectId, userId);
    if (!projectExists) throw new NotFoundError("Project not found");

    const statuses = [...new Set(inputs.map((i) => i.status as TaskStatus))];
    const maxEntries = await Promise.all(
      statuses.map((s) => taskRepository.maxPositionIn(projectId, s).then((max) => [s, max] as const)),
    );
    const basePos = new Map<TaskStatus, number>(maxEntries);
    const counters = new Map<TaskStatus, number>();

    const items = inputs.map((input) => {
      const status = input.status as TaskStatus;
      const base = basePos.get(status) ?? 0;
      const n = (counters.get(status) ?? 0) + 1;
      counters.set(status, n);
      return {
        projectId,
        createdById: userId,
        title: input.title,
        description: input.description,
        status,
        priority: input.priority,
        startDate: input.startDate,
        dueDate: input.dueDate,
        position: base + n * POSITION_STEP,
      };
    });

    return taskRepository.createMany(items);
  },

  async update(taskId: string, userId: string, input: UpdateTaskInput): Promise<Task> {
    const updated = await taskRepository.update(taskId, userId, {
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority,
      ...(input.startDate !== undefined ? { startDate: input.startDate } : {}),
      ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
      position: input.position,
    });
    if (!updated) throw new NotFoundError("Task not found");
    return updated;
  },

  async updateStatus(taskId: string, userId: string, input: UpdateTaskStatusInput): Promise<Task> {
    const updated = await taskRepository.update(taskId, userId, {
      status: input.status,
      position: input.position,
    });
    if (!updated) throw new NotFoundError("Task not found");
    return updated;
  },

  async delete(taskId: string, userId: string): Promise<void> {
    const count = await taskRepository.softDelete(taskId, userId);
    if (count === 0) throw new NotFoundError("Task not found");
  },
};
