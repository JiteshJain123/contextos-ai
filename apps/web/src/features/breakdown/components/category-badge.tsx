import { Monitor, Server, Database, TestTube, Rocket } from "lucide-react";

import { cn } from "@/lib/cn";
import type { TaskCategory } from "@contextos-ai/validators/task";
import { CATEGORY_META } from "../lib/category-meta";

const ICONS = { Monitor, Server, Database, TestTube, Rocket };

interface CategoryBadgeProps {
  category: TaskCategory;
  className?: string;
}

export function CategoryBadge({ category, className }: CategoryBadgeProps) {
  const meta = CATEGORY_META[category];
  const Icon = ICONS[meta.icon as keyof typeof ICONS];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        meta.bg,
        meta.color,
        meta.border,
        "border",
        className,
      )}
    >
      <Icon className="size-3" />
      {meta.label}
    </span>
  );
}
