import type { InsightDTO, InsightStreamEvent, InsightType } from "@/lib/validators/insight";

import { api } from "@/lib/api-client";
import { clientEnv } from "@/env/client";

const API_BASE = `${clientEnv.NEXT_PUBLIC_API_URL}/api/v1`;

export const insightApi = {
  listInsights: (projectId: string) =>
    api.get<InsightDTO[]>(`/projects/${projectId}/insights`),

  deleteInsight: (projectId: string, type: InsightType) =>
    api.delete<void>(`/projects/${projectId}/insights/${type}`),

  dismissInsight: (projectId: string, type: InsightType) =>
    api.patch<InsightDTO>(`/projects/${projectId}/insights/${type}/dismiss`, {}),

  undismissInsight: (projectId: string, type: InsightType) =>
    api.patch<InsightDTO>(`/projects/${projectId}/insights/${type}/undismiss`, {}),

  /**
   * POST /projects/:projectId/insights/:type/generate — SSE streaming.
   * Yields parsed insight stream events as they arrive.
   * Pass `force=true` to bypass the 30-minute server-side cache.
   */
  async *generateInsight(
    projectId: string,
    type: InsightType,
    force = false,
  ): AsyncGenerator<InsightStreamEvent, void, undefined> {
    const qs = force ? "?force=true" : "";
    const response = await fetch(
      `${API_BASE}/projects/${projectId}/insights/${type}/generate${qs}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        credentials: "include",
      },
    );

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
          const event = JSON.parse(line.slice(6)) as InsightStreamEvent;
          yield event;
        } catch {
          // malformed event — skip
        }
      }
    }
  },
};
