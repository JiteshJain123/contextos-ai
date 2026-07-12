"use client";

import { useMemo } from "react";
import type { TaskDTO } from "@contextos-ai/validators/task";

export interface AssigneeWorkload {
  userId: string;
  name: string;
  email: string;
  totalTasks: number;
  doneTasks: number;
  inProgressTasks: number;
  reviewTasks: number;
  todoTasks: number;
  overdueTasks: number;
  activeTasks: number;
  isOverloaded: boolean;
  isUnderutilized: boolean;
  burnoutRisk: "none" | "low" | "medium" | "high";
}

export interface WorkloadIntelligence {
  assignees: AssigneeWorkload[];
  overloadedCount: number;
  underutilizedCount: number;
  unassignedTasks: number;
  teamSize: number;
  avgTasksPerPerson: number;
}

export function useWorkloadIntelligence(tasks: TaskDTO[]): WorkloadIntelligence {
  return useMemo(
    () => ({
      assignees: [],
      overloadedCount: 0,
      underutilizedCount: 0,
      unassignedTasks: tasks.filter((t) => t.status !== "DONE").length,
      teamSize: 0,
      avgTasksPerPerson: 0,
    }),
    [tasks],
  );
}
