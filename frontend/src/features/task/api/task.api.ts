import type {
  BatchCreateTasksInput,
  CreateTaskInput,
  TaskDTO,
  UpdateTaskInput,
  UpdateTaskStatusInput,
  TaskPriority,
  TaskStatus,
  TaskCategory,
  TaskComplexity,
} from "@/lib/validators/task";

import { api, getAuthToken } from "@/lib/api-client";
import { clientEnv } from "@/env/client";

const API_BASE = `${clientEnv.NEXT_PUBLIC_API_URL}/api/v1`;

export type BreakdownTaskRaw = {
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  estimatedEffort?: string;
  estimatedHours?: number;
  assigneeRole?: string;
  week?: number;
  dependencies?: string[];
  acceptanceCriteria?: string[];
  implementationNotes?: string;
  category?: TaskCategory;
  complexity?: TaskComplexity;
  suggestedDueDate?: string;
  sprintOrder?: number;
};

type BreakdownEvent =
  | { type: "task"; task: BreakdownTaskRaw }
  | { type: "done"; count: number }
  | { type: "error"; message: string };

/**
 * HTTP layer for the task domain. Mirrors the two-shape backend:
 *   - list/create are nested under projects
 *   - update/delete/status are flat by task id
 */
export const taskApi = {
  list: (projectId: string) => api.get<TaskDTO[]>(`/projects/${projectId}/tasks`),

  create: (projectId: string, input: CreateTaskInput) =>
    api.post<TaskDTO>(`/projects/${projectId}/tasks`, input),

  createBatch: (projectId: string, tasks: BatchCreateTasksInput["tasks"]) =>
    api.post<TaskDTO[]>(`/projects/${projectId}/tasks/batch`, { tasks }),

  update: (taskId: string, input: UpdateTaskInput) => api.patch<TaskDTO>(`/tasks/${taskId}`, input),

  delete: (taskId: string) => api.delete<void>(`/tasks/${taskId}`),

  updateStatus: (taskId: string, input: UpdateTaskStatusInput) =>
    api.patch<TaskDTO>(`/tasks/${taskId}/status`, input),

  /**
   * POST /projects/:projectId/conversations/breakdown-tasks — SSE streaming.
   *
   * Yields individual task objects as the AI generates them, then a done event.
   */
  async *breakdown(
    projectId: string,
    goal: string,
  ): AsyncGenerator<BreakdownEvent, void, undefined> {
    const token = await getAuthToken();
    const response = await fetch(
      `${API_BASE}/projects/${projectId}/conversations/breakdown-tasks`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ goal }),
      },
    );

    if (!response.ok) {
      let message = `Request failed: ${response.status}`;
      try {
        const body = (await response.json()) as { error?: { message?: string } };
        message = body?.error?.message ?? message;
      } catch { /* not JSON */ }
      yield { type: "error", message };
      return;
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";
      for (const part of parts) {
        const line = part.trim();
        if (!line.startsWith("data: ")) continue;
        try {
          const event = JSON.parse(line.slice(6)) as BreakdownEvent;
          yield event;
        } catch { /* malformed event */ }
      }
    }
  },
};
