import type { TaskStatus } from "@contextos-ai/database";
import type { ActionPayload, ActionResult } from "@contextos-ai/validators/ai-actions";
import { BadRequestError, NotFoundError } from "../../lib/http-errors.js";
import { logger } from "../../lib/logger.js";
import { prisma } from "@contextos-ai/database";

const POSITION_STEP = 1024;

function projectOwned(userId: string) {
  return { deletedAt: null as null, ownerId: userId };
}

async function requireProject(projectId: string, userId: string): Promise<void> {
  const p = await prisma.project.findFirst({
    where: { id: projectId, ...projectOwned(userId) },
    select: { id: true },
  });
  if (!p) throw new NotFoundError("Project not found or access denied");
}

async function findTaskInProject(projectId: string, titleQuery: string) {
  const exact = await prisma.task.findFirst({
    where: { projectId, title: titleQuery, deletedAt: null },
    select: { id: true, title: true },
  });
  if (exact) return exact;

  return prisma.task.findFirst({
    where: {
      projectId,
      title: { contains: titleQuery, mode: "insensitive" },
      deletedAt: null,
    },
    select: { id: true, title: true },
  });
}

async function appendPosition(projectId: string, status: TaskStatus): Promise<number> {
  const agg = await prisma.task.aggregate({
    where: { projectId, status, deletedAt: null },
    _max: { position: true },
  });
  return (agg._max?.position ?? 0) + POSITION_STEP;
}

export const actionExecutorService = {
  async execute(
    projectId: string,
    userId: string,
    action: ActionPayload,
  ): Promise<ActionResult> {
    logger.info({ projectId, userId, actionType: action.type }, "action-executor: start");

    await requireProject(projectId, userId);

    switch (action.type) {
      case "create_task":
        return executeCreateTask(projectId, userId, action);

      case "update_task_status":
        return executeUpdateTaskStatus(projectId, userId, action);

      case "create_subtasks":
        return executeCreateSubtasks(projectId, userId, action);

      case "reprioritize_tasks":
        return executeReprioritizeTasks(projectId, userId, action);

      case "assign_task":
        throw new BadRequestError("Task assignment is not available in single-user mode");

      case "generate_sprint_tasks":
        throw new BadRequestError(
          "generate_sprint_tasks must be executed via the breakdown endpoint",
        );

      default: {
        const unreachable: never = action;
        throw new BadRequestError(
          `Unknown action type: ${(unreachable as ActionPayload).type}`,
        );
      }
    }
  },
};

async function executeCreateTask(
  projectId: string,
  userId: string,
  action: Extract<ActionPayload, { type: "create_task" }>,
): Promise<ActionResult> {
  const position = await appendPosition(projectId, action.status);

  const task = await prisma.task.create({
    data: {
      projectId,
      createdById: userId,
      title: action.title,
      description: action.description ?? null,
      status: action.status,
      priority: action.priority,
      dueDate: action.dueDate ? new Date(action.dueDate) : null,
      position,
    },
    select: { id: true, title: true },
  });

  logger.info({ projectId, taskId: task.id }, "action-executor: task created");

  return {
    success: true,
    actionType: "create_task",
    tasksCreated: 1,
    message: `Task "${task.title}" created successfully.`,
  };
}

async function executeUpdateTaskStatus(
  projectId: string,
  _userId: string,
  action: Extract<ActionPayload, { type: "update_task_status" }>,
): Promise<ActionResult> {
  const task = await findTaskInProject(projectId, action.taskTitle);
  if (!task) {
    throw new NotFoundError(
      `Task matching "${action.taskTitle}" was not found in this project`,
    );
  }

  const position = await appendPosition(projectId, action.newStatus);

  await prisma.task.update({
    where: { id: task.id },
    data: { status: action.newStatus, position },
  });

  logger.info(
    { projectId, taskId: task.id, newStatus: action.newStatus },
    "action-executor: task status updated",
  );

  return {
    success: true,
    actionType: "update_task_status",
    tasksUpdated: 1,
    message: `"${task.title}" moved to ${action.newStatus.replace(/_/g, " ")}.`,
  };
}

async function executeCreateSubtasks(
  projectId: string,
  userId: string,
  action: Extract<ActionPayload, { type: "create_subtasks" }>,
): Promise<ActionResult> {
  const parentTask = await findTaskInProject(projectId, action.parentTaskTitle);
  const basePosition = await appendPosition(projectId, "TODO");

  const created = await prisma.$transaction(
    action.subtasks.map((subtask, idx) =>
      prisma.task.create({
        data: {
          projectId,
          createdById: userId,
          title: subtask.title,
          description: parentTask ? `Subtask of: ${parentTask.title}` : undefined,
          status: "TODO",
          priority: subtask.priority,
          position: basePosition + idx * POSITION_STEP,
        },
        select: { id: true, title: true },
      }),
    ),
  );

  logger.info({ projectId, count: created.length }, "action-executor: subtasks created");

  return {
    success: true,
    actionType: "create_subtasks",
    tasksCreated: created.length,
    message: `Created ${created.length} subtask${created.length !== 1 ? "s" : ""} for "${action.parentTaskTitle}".`,
  };
}

async function executeReprioritizeTasks(
  projectId: string,
  _userId: string,
  action: Extract<ActionPayload, { type: "reprioritize_tasks" }>,
): Promise<ActionResult> {
  const titles = action.changes.map((c) => c.taskTitle);
  const foundTasks = await prisma.task.findMany({
    where: {
      projectId,
      deletedAt: null,
      OR: titles.map((t) => ({
        title: { contains: t, mode: "insensitive" as const },
      })),
    },
    select: { id: true, title: true },
  });

  if (foundTasks.length === 0) {
    throw new NotFoundError("None of the specified tasks were found in this project");
  }

  const resolvedChanges = action.changes.flatMap((change) => {
    const match = foundTasks.find((t) =>
      t.title.toLowerCase().includes(change.taskTitle.toLowerCase()),
    );
    if (!match) return [];
    return [{ taskId: match.id, taskTitle: match.title, newPriority: change.newPriority }];
  });

  if (resolvedChanges.length === 0) {
    throw new NotFoundError("Could not match any task titles from the requested changes");
  }

  await prisma.$transaction(
    resolvedChanges.map(({ taskId, newPriority }) =>
      prisma.task.update({
        where: { id: taskId },
        data: { priority: newPriority },
      }),
    ),
  );

  const skipped = action.changes.length - resolvedChanges.length;
  const skipNote = skipped > 0 ? ` (${skipped} not found, skipped)` : "";

  logger.info(
    { projectId, updated: resolvedChanges.length },
    "action-executor: tasks reprioritized",
  );

  return {
    success: true,
    actionType: "reprioritize_tasks",
    tasksUpdated: resolvedChanges.length,
    message: `Reprioritized ${resolvedChanges.length} task${resolvedChanges.length !== 1 ? "s" : ""}${skipNote}.`,
  };
}
