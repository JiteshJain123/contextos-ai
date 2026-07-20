import type { PlanDTO, PlanStreamEvent, UpdatePlanInput } from "@/lib/validators/plan";

import { api } from "@/lib/api-client";
import { clientEnv } from "@/env/client";

const API_BASE = `${clientEnv.NEXT_PUBLIC_API_URL}/api/v1`;

export const planApi = {
  getPlan: (projectId: string) =>
    api.get<PlanDTO | null>(`/projects/${projectId}/plan`),

  updatePlan: (projectId: string, data: UpdatePlanInput) =>
    api.patch<PlanDTO>(`/projects/${projectId}/plan`, data),

  deletePlan: (projectId: string) =>
    api.delete<void>(`/projects/${projectId}/plan`),

  /**
   * POST /projects/:projectId/plan/generate — SSE streaming.
   *
   * Yields parsed plan stream events as they arrive from the server.
   */
  async *generatePlan(
    projectId: string,
    goal: string,
  ): AsyncGenerator<PlanStreamEvent, void, undefined> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/plan/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      credentials: "include",
      body: JSON.stringify({ goal }),
    });

    if (!response.ok) {
      let message = `Request failed: ${response.status}`;
      try {
        const body = (await response.json()) as { error?: { message?: string } };
        message = body?.error?.message ?? message;
      } catch {
        // not JSON
      }
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
          const event = JSON.parse(line.slice(6)) as PlanStreamEvent;
          yield event;
        } catch {
          // malformed event — skip
        }
      }
    }
  },
};
