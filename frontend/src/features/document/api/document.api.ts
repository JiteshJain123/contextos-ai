import type {
  DocumentDTO,
  DocumentStreamEvent,
  DocumentPlanStreamEvent,
  ImportTasksFromDocumentInput,
} from "@/lib/validators/document";
import type { TaskDTO } from "@/lib/validators/task";

import { api, getAuthToken } from "@/lib/api-client";
import { clientEnv } from "@/env/client";

const API_BASE = `${clientEnv.NEXT_PUBLIC_API_URL}/api/v1`;

export const documentApi = {
  // ── CRUD ──────────────────────────────────────────────────────────────────

  listDocuments: (projectId: string) =>
    api.get<DocumentDTO[]>(`/projects/${projectId}/documents`),

  getDocument: (projectId: string, docId: string) =>
    api.get<DocumentDTO>(`/projects/${projectId}/documents/${docId}`),

  deleteDocument: (projectId: string, docId: string) =>
    api.delete<void>(`/projects/${projectId}/documents/${docId}`),

  importTasks: (projectId: string, docId: string, input: ImportTasksFromDocumentInput) =>
    api.post<TaskDTO[]>(`/projects/${projectId}/documents/${docId}/import-tasks`, input),

  // ── Upload (multipart — bypasses api.post, uses raw fetch) ───────────────

  async uploadDocument(projectId: string, file: File): Promise<DocumentDTO> {
    const formData = new FormData();
    formData.append("file", file);

    const token = await getAuthToken();
    const response = await fetch(
      `${API_BASE}/projects/${projectId}/documents`,
      {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          // No Content-Type — browser sets multipart/form-data + boundary automatically
        },
        body: formData,
      },
    );

    if (!response.ok) {
      let message = `Upload failed: ${response.status}`;
      try {
        const body = (await response.json()) as { error?: { message?: string } };
        message = body?.error?.message ?? message;
      } catch {
        // not JSON
      }
      throw new Error(message);
    }

    const envelope = (await response.json()) as { data: DocumentDTO };
    return envelope.data;
  },

  // ── Generate Plan SSE ─────────────────────────────────────────────────────

  async *generatePlan(
    projectId: string,
    docId: string,
  ): AsyncGenerator<DocumentPlanStreamEvent, void, undefined> {
    const token = await getAuthToken();
    const response = await fetch(
      `${API_BASE}/projects/${projectId}/documents/${docId}/generate-plan`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
    );

    if (!response.ok) {
      let message = `Plan generation failed: ${response.status}`;
      try {
        const body = (await response.json()) as { error?: { message?: string } };
        message = body?.error?.message ?? message;
      } catch {
        // not JSON
      }
      yield { type: "plan_error", message };
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
          const event = JSON.parse(line.slice(6)) as DocumentPlanStreamEvent;
          yield event;
        } catch {
          // malformed — skip
        }
      }
    }
  },

  // ── Analyze SSE ───────────────────────────────────────────────────────────

  async *analyzeDocument(
    projectId: string,
    docId: string,
  ): AsyncGenerator<DocumentStreamEvent, void, undefined> {
    const token = await getAuthToken();
    const response = await fetch(
      `${API_BASE}/projects/${projectId}/documents/${docId}/analyze`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
    );

    if (!response.ok) {
      let message = `Analysis failed: ${response.status}`;
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
          const event = JSON.parse(line.slice(6)) as DocumentStreamEvent;
          yield event;
        } catch {
          // malformed — skip
        }
      }
    }
  },
};
