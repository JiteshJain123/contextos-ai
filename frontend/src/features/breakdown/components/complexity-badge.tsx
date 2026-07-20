import { cn } from "@/lib/cn";
import type { TaskComplexity } from "@/lib/validators/task";
import { COMPLEXITY_META } from "../lib/complexity-meta";

interface ComplexityBadgeProps {
  complexity: TaskComplexity;
  className?: string;
}

export function ComplexityBadge({ complexity, className }: ComplexityBadgeProps) {
  const meta = COMPLEXITY_META[complexity];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 font-mono text-xs font-semibold",
        meta.bg,
        meta.color,
        className,
      )}
      title={meta.hours}
    >
      {meta.label}
    </span>
  );
}
