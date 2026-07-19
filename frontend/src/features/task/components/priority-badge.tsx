import type { TaskPriority } from "@/lib/validators/task";

import { Badge } from "@/components/ui/badge";

const variantByPriority = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  URGENT: "urgent",
} as const satisfies Record<TaskPriority, "low" | "medium" | "high" | "urgent">;

const labelByPriority = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
} as const satisfies Record<TaskPriority, string>;

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return <Badge variant={variantByPriority[priority]}>{labelByPriority[priority]}</Badge>;
}
