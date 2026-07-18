export const queryKeys = {
  auth: {
    all: ["auth"] as const,
    me: () => [...queryKeys.auth.all, "me"] as const,
  },
  user: {
    all: ["user"] as const,
    detail: (id: string) => [...queryKeys.user.all, "detail", id] as const,
  },
  project: {
    all: ["project"] as const,
    lists: () => [...queryKeys.project.all, "list"] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.project.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.project.all, "detail", id] as const,
  },
  task: {
    all: ["task"] as const,
    byProject: (projectId: string) => [...queryKeys.task.all, "byProject", projectId] as const,
    detail: (id: string) => [...queryKeys.task.all, "detail", id] as const,
  },
  ai: {
    all: ["ai"] as const,
    conversations: (projectId: string) =>
      [...queryKeys.ai.all, "conversations", projectId] as const,
    messages: (conversationId: string) =>
      [...queryKeys.ai.all, "messages", conversationId] as const,
  },
  plan: {
    all: ["plan"] as const,
    byProject: (projectId: string) => [...queryKeys.plan.all, "byProject", projectId] as const,
  },
  insight: {
    all: ["insight"] as const,
    byProject: (projectId: string) => [...queryKeys.insight.all, "byProject", projectId] as const,
  },
  dashboard: {
    all: ["dashboard"] as const,
    stats: () => [...queryKeys.dashboard.all, "stats"] as const,
  },
  health: {
    all: ["health"] as const,
    byProject: (projectId: string) => [...queryKeys.health.all, "byProject", projectId] as const,
  },
  document: {
    all: ["document"] as const,
    byProject: (projectId: string) => [...queryKeys.document.all, "byProject", projectId] as const,
    detail: (docId: string) => [...queryKeys.document.all, "detail", docId] as const,
  },
  automation: {
    all: ["automation"] as const,
    detect: (projectId: string) => [...queryKeys.automation.all, "detect", projectId] as const,
    history: (projectId: string) => [...queryKeys.automation.all, "history", projectId] as const,
  },
  memory: {
    all: ["memory"] as const,
    byProject: (projectId: string) => [...queryKeys.memory.all, "byProject", projectId] as const,
  },
  calendar: {
    all: ["calendar"] as const,
    byProject: (projectId: string) => [...queryKeys.calendar.all, "byProject", projectId] as const,
  },
  milestone: {
    all: ["milestone"] as const,
    byProject: (projectId: string) =>
      [...queryKeys.milestone.all, "byProject", projectId] as const,
  },
} as const;
