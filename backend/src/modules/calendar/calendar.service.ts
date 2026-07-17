import { prisma } from "@/database";
import type { CalendarData, DocumentDeadline } from "@/validators/calendar";
import { NotFoundError } from "../../lib/http-errors.js";

const PROJECT_ACCESS = (userId: string) => ({
  deletedAt: null as null,
  ownerId: userId,
});

export const calendarService = {
  async getCalendarData(projectId: string, userId: string): Promise<CalendarData> {
    const project = await prisma.project.findFirst({
      where: { id: projectId, ...PROJECT_ACCESS(userId) },
      select: { id: true },
    });
    if (!project) throw new NotFoundError("Project not found");

    const [tasks, milestones, documents] = await Promise.all([
      prisma.task.findMany({
        where: { projectId, deletedAt: null },
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          startDate: true,
          dueDate: true,
        },
        orderBy: { dueDate: "asc" },
      }),
      prisma.projectMilestone.findMany({
        where: { projectId },
        select: { id: true, title: true, targetDate: true, completed: true },
        orderBy: { targetDate: "asc" },
      }),
      prisma.projectDocument.findMany({
        where: { projectId, deletedAt: null, status: "READY" },
        select: { id: true, originalName: true, deadlinesJson: true },
      }),
    ]);

    // Extract deadlines from processed documents
    const documentDeadlines: DocumentDeadline[] = [];
    for (const doc of documents) {
      if (!Array.isArray(doc.deadlinesJson)) continue;
      const deadlines = doc.deadlinesJson as Array<{
        date?: string;
        description?: string;
        text?: string;
      }>;
      for (const dl of deadlines) {
        const rawDate = dl.date ?? dl.text;
        if (!rawDate) continue;
        const parsed = new Date(rawDate);
        if (isNaN(parsed.getTime())) continue;
        documentDeadlines.push({
          id: `${doc.id}-${parsed.getTime()}`,
          documentName: doc.originalName,
          date: parsed,
          description: dl.description ?? dl.text ?? "Deadline",
        });
      }
    }

    return {
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        startDate: t.startDate,
        dueDate: t.dueDate,
      })),
      milestones: milestones.map((m) => ({
        id: m.id,
        title: m.title,
        targetDate: m.targetDate,
        completed: m.completed,
      })),
      documentDeadlines,
    };
  },
};
