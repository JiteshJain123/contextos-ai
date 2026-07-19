import type {
  CreateProjectInput,
  ProjectDTO,
  UpdateProjectInput,
} from "@/lib/validators/project";

import { api } from "@/lib/api-client";
import type { ApiPaginated } from "@/types/api";

/**
 * HTTP layer for the project domain.
 *
 * Each function maps 1:1 to a backend endpoint and returns the unwrapped
 * `data` payload. TanStack Query hooks wrap these to add caching + state.
 */
export const projectApi = {
  /** List with pagination — returns the FULL envelope so callers can render meta. */
  list: (params?: { page?: number; pageSize?: number }): Promise<ApiPaginated<ProjectDTO>> => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.pageSize) query.set("pageSize", String(params.pageSize));
    const qs = query.toString();
    return api.getPaginated<ProjectDTO>(`/projects${qs ? `?${qs}` : ""}`);
  },

  get: (id: string) => api.get<ProjectDTO>(`/projects/${id}`),

  create: (input: CreateProjectInput) => api.post<ProjectDTO>("/projects", input),

  update: (id: string, input: UpdateProjectInput) =>
    api.patch<ProjectDTO>(`/projects/${id}`, input),

  delete: (id: string) => api.delete<void>(`/projects/${id}`),
};
