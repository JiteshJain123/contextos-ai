import type { CreateMilestoneInput, UpdateMilestoneInput } from "@/validators/milestone";
import { NotFoundError } from "../../lib/http-errors.js";
import { milestoneRepository } from "./milestone.repository.js";

export const milestoneService = {
  async list(projectId: string, userId: string) {
    const milestones = await milestoneRepository.listForProject(projectId, userId);
    if (milestones === null) throw new NotFoundError("Project not found");
    return milestones;
  },

  async create(projectId: string, userId: string, input: CreateMilestoneInput) {
    const exists = await milestoneRepository.projectExistsForUser(projectId, userId);
    if (!exists) throw new NotFoundError("Project not found");
    return milestoneRepository.create(projectId, input);
  },

  async update(milestoneId: string, userId: string, input: UpdateMilestoneInput) {
    const updated = await milestoneRepository.update(milestoneId, userId, input);
    if (!updated) throw new NotFoundError("Milestone not found");
    return updated;
  },

  async delete(milestoneId: string, userId: string): Promise<void> {
    const deleted = await milestoneRepository.delete(milestoneId, userId);
    if (!deleted) throw new NotFoundError("Milestone not found");
  },
};
