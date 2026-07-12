"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export type RecentTask = {
  id: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  updatedAt: string;
  projectName: string;
  projectSlug: string;
};

export type DashboardStats = {
  projectCount: number;
  tasksByStatus: Record<"TODO" | "IN_PROGRESS" | "REVIEW" | "DONE", number>;
  tasksByPriority: Record<"LOW" | "MEDIUM" | "HIGH" | "URGENT", number>;
  overdueCount: number;
  avgHealthScore: number;
  overdueMilestoneCount: number;
  completionTrend: Array<{ label: string; completed: number }>;
  recentTasks: RecentTask[];
};

export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: () => api.get<DashboardStats>("/projects/stats/dashboard"),
  });
}
