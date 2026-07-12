import { Loader2 } from "lucide-react";

interface StreamingProgressProps {
  taskCount: number;
  isGenerating: boolean;
}

export function StreamingProgress({ taskCount, isGenerating }: StreamingProgressProps) {
  if (!isGenerating && taskCount === 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {isGenerating && <Loader2 className="size-4 animate-spin text-primary" />}
          <span>
            {isGenerating
              ? `Generating tasks… ${taskCount > 0 ? `(${taskCount} so far)` : ""}`
              : `${taskCount} tasks generated`}
          </span>
        </div>
        {taskCount > 0 && (
          <span className="text-xs text-muted-foreground">{taskCount} tasks</span>
        )}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{
            width: isGenerating
              ? `${Math.min(90, (taskCount / 12) * 100)}%`
              : "100%",
          }}
        />
      </div>
    </div>
  );
}
