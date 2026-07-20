import type {
  ProjectMemoryDTO,
  MemoryStreamEvent,
  RagContext,
} from "@/lib/validators/memory";

import { api } from "@/lib/api-client";
import { clientEnv } from "@/env/client";

const API_BASE = `${clientEnv.NEXT_PUBLIC_API_URL}/api/v1`;

export const memoryApi = {
  // ── Snapshot ──────────────────────────────────────────────────────────────

  getMemory: (projectId: string) =>
    api.get<ProjectMemoryDTO | null>(`/projects/${projectId}/memory`),

  clearMemory: (projectId: string) =>
    api.delete<null>(`/projects/${projectId}/memory`),

  // ── RAG context ───────────────────────────────────────────────────────────

  getRAGContext: (projectId: string, query: string) =>
    api.get<RagContext>(`/projects/${projectId}/memory/rag?query=${encodeURIComponent(query)}`),

  // ── Rebuild (SSE) ─────────────────────────────────────────────────────────

  async *rebuild(projectId: string): AsyncGenerator<MemoryStreamEvent, void, undefined> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/memory/rebuild`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      credentials: "include",
    });

    if (!response.ok) {
      let message = `Rebuild failed: ${response.status}`;
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
          const event = JSON.parse(line.slice(6)) as MemoryStreamEvent;
          yield event;
        } catch {
          // malformed — skip
        }
      }
    }
  },
};
