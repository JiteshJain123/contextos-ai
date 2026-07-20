import type { CalendarData } from "@/lib/validators/calendar";
import type {
  CreateMilestoneInput,
  MilestoneDTO,
  UpdateMilestoneInput,
} from "@/lib/validators/milestone";

import { api } from "@/lib/api-client";

export const calendarApi = {
  // ── Calendar data (tasks + milestones + doc deadlines) ────────────────────

  getCalendarData: (projectId: string) =>
    api.get<CalendarData>(`/projects/${projectId}/calendar`),

  // ── Milestones ────────────────────────────────────────────────────────────

  listMilestones: (projectId: string) =>
    api.get<MilestoneDTO[]>(`/projects/${projectId}/milestones`),

  createMilestone: (projectId: string, input: CreateMilestoneInput) =>
    api.post<MilestoneDTO>(`/projects/${projectId}/milestones`, input),

  updateMilestone: (milestoneId: string, input: UpdateMilestoneInput) =>
    api.patch<MilestoneDTO>(`/milestones/${milestoneId}`, input),

  deleteMilestone: (milestoneId: string) =>
    api.delete<void>(`/milestones/${milestoneId}`),
};
