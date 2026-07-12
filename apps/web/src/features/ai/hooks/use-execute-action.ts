"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { queryKeys } from "@/lib/query-keys";
import type { ActionPayload, ActionResult } from "@contextos-ai/validators/ai-actions";
import { describeAction } from "@contextos-ai/validators/ai-actions";
import type { TaskDTO } from "@contextos-ai/validators/task";

import { aiApi } from "../api/ai.api";

// ── Types ──────────────────────────────────────────────────────────────────────

type MutationContext = {
  previousTasks: TaskDTO[] | undefined;
  toastId: string | number;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Two-pass title match — mirrors the backend `findTaskInProject` logic so the
 * optimistic update targets the same task the executor will actually change.
 */
function findByTitle(tasks: TaskDTO[], query: string): TaskDTO | undefined {
  return (
    tasks.find((t) => t.title === query) ??
    tasks.find((t) => t.title.toLowerCase().includes(query.toLowerCase()))
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────

/**
 * Mutation hook for executing a confirmed AI action.
 *
 * Strategy:
 *   onMutate   — cancel in-flight refetches, snapshot cache, show loading toast,
 *                apply optimistic update for the action types where it's safe
 *   onSuccess  — update the loading toast to success
 *   onError    — restore snapshot, update toast to error
 *   onSettled  — always invalidate so real server data replaces any optimistic entry
 */
export function useExecuteAction(
  projectId: string,
  conversationId: string,
  onSuccess?: () => void,
) {
  const queryClient = useQueryClient();
  const taskKey = queryKeys.task.byProject(projectId);

  return useMutation<ActionResult, Error, ActionPayload, MutationContext>({
    mutationFn: (action) => aiApi.executeAction(conversationId, action),

    // ── Optimistic update ──────────────────────────────────────────────────────
    onMutate: async (action): Promise<MutationContext> => {
      // Stop any background refetch from overwriting the optimistic state
      await queryClient.cancelQueries({ queryKey: taskKey });

      const previousTasks = queryClient.getQueryData<TaskDTO[]>(taskKey);

      // Show a loading toast that we'll update (by ID) later
      const toastId = toast.loading(`Applying: ${describeAction(action)}…`);

      queryClient.setQueryData<TaskDTO[]>(taskKey, (old = []) =>
        applyOptimisticUpdate(old, action, projectId),
      );

      return { previousTasks, toastId };
    },

    // ── Success ────────────────────────────────────────────────────────────────
    onSuccess: (result, _action, context) => {
      toast.success(result.message, { id: context?.toastId });
      onSuccess?.();
    },

    // ── Error + rollback ───────────────────────────────────────────────────────
    onError: (err, _action, context) => {
      if (context?.previousTasks !== undefined) {
        queryClient.setQueryData(taskKey, context.previousTasks);
      }

      const message =
        err instanceof Error ? err.message : "Action failed — please try again";
      toast.error(message, { id: context?.toastId });
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: taskKey });
    },
  });
}

// ── Optimistic update logic ────────────────────────────────────────────────────

function applyOptimisticUpdate(
  old: TaskDTO[],
  action: ActionPayload,
  projectId: string,
): TaskDTO[] {
  switch (action.type) {
    case "create_task": {
      const placeholder: TaskDTO = {
        id: `__optimistic__${Date.now()}`,
        projectId,
        createdById: "",
        title: action.title,
        description: action.description ?? null,
        status: action.status,
        priority: action.priority,
        startDate: null,
        dueDate: action.dueDate ? new Date(action.dueDate) : null,
        position: 999_999,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return [...old, placeholder];
    }

    case "update_task_status": {
      const target = findByTitle(old, action.taskTitle);
      if (!target) return old;
      return old.map((t) =>
        t === target
          ? { ...t, status: action.newStatus, updatedAt: new Date() }
          : t,
      );
    }

    case "create_subtasks": {
      const base = Date.now();
      const placeholders: TaskDTO[] = action.subtasks.map((st, i) => ({
        id: `__optimistic__${base}_${i}`,
        projectId,
        createdById: "",
        title: st.title,
        description: `Subtask of: ${action.parentTaskTitle}`,
        status: "TODO" as const,
        priority: st.priority,
        startDate: null,
        dueDate: null,
        position: 999_999 + i,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      return [...old, ...placeholders];
    }

    case "reprioritize_tasks": {
      return old.map((t) => {
        const change = action.changes.find((c) =>
          t.title.toLowerCase().includes(c.taskTitle.toLowerCase()),
        );
        return change
          ? { ...t, priority: change.newPriority, updatedAt: new Date() }
          : t;
      });
    }

    // assign_task: assignee details aren't in the payload, skip optimistic
    // generate_sprint_tasks: AI-generated content, nothing to optimise
    default:
      return old;
  }
}
