import type { CreateProjectInput, UpdateProjectInput } from "@contextos-ai/validators/project";
import type { Project } from "@contextos-ai/database";

import { ConflictError, NotFoundError } from "../../lib/http-errors.js";
import { projectRepository, type ProjectWithStats } from "./project.repository.js";

export interface ListResult {
  items: ProjectWithStats[];
  total: number;
}

export const projectService = {
  async list(
    userId: string,
    params: { page: number; pageSize: number; sortOrder: "asc" | "desc" },
  ): Promise<ListResult> {
    return projectRepository.listForUser(userId, params);
  },

  async getById(id: string, userId: string): Promise<Project> {
    const project = await projectRepository.findByIdWithAccess(id, userId);
    if (!project) throw new NotFoundError("Project not found");
    return project;
  },

  async getBySlug(slug: string, userId: string): Promise<Project> {
    const project = await projectRepository.findBySlugWithAccess(slug, userId);
    if (!project) throw new NotFoundError("Project not found");
    return project;
  },

  async create(userId: string, input: CreateProjectInput): Promise<Project> {
    // Uniqueness check (also enforced by the DB constraint — this is for a
    // friendly error message instead of a P2002 leak).
    const existing = await projectRepository.findBySlugForUser(input.slug, userId);
    if (existing) {
      throw new ConflictError(`A project with slug "${input.slug}" already exists`);
    }
    return projectRepository.create({ ownerId: userId, ...input });
  },

  async update(id: string, userId: string, input: UpdateProjectInput): Promise<Project> {
    // Confirm ownership BEFORE writing — repository.update silently no-ops on miss.
    const existing = await projectRepository.findByIdForUser(id, userId);
    if (!existing) throw new NotFoundError("Project not found");

    // If slug is changing, check uniqueness.
    if (input.slug && input.slug !== existing.slug) {
      const collision = await projectRepository.findBySlugForUser(input.slug, userId);
      if (collision) {
        throw new ConflictError(`A project with slug "${input.slug}" already exists`);
      }
    }

    const updated = await projectRepository.update(id, userId, input);
    if (!updated) throw new NotFoundError("Project not found");
    return updated;
  },

  async getDashboardStats(userId: string) {
    return projectRepository.getDashboardStats(userId);
  },

  async delete(id: string, userId: string): Promise<void> {
    const count = await projectRepository.softDelete(id, userId);
    if (count === 0) throw new NotFoundError("Project not found");
  },
};
