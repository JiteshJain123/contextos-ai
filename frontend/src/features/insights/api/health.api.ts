import type { ProjectHealthDTO } from "@/lib/validators/health";

import { api } from "@/lib/api-client";

export const healthApi = {
  getHealth: (projectId: string) =>
    api.get<ProjectHealthDTO>(`/projects/${projectId}/health`),

  computeHealth: (projectId: string) =>
    api.post<ProjectHealthDTO>(`/projects/${projectId}/health/compute`, {}),
};
