import type { DetectResponse } from "@/lib/validators/automation";

import { api } from "@/lib/api-client";

export const automationApi = {
  detectTriggers: (projectId: string) =>
    api.get<DetectResponse>(`/projects/${projectId}/automation/detect`),

  getHistory: (projectId: string) =>
    api.get<unknown[]>(`/projects/${projectId}/automation/history`),
};
