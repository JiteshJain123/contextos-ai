"use client";

import { useMemo } from "react";
import { GitBranch } from "lucide-react";

import type { BreakdownTask } from "@/features/task/hooks/use-task-breakdown";
import { buildGraphLayout } from "../lib/graph-layout";
import { CategoryBadge } from "./category-badge";
import { ComplexityBadge } from "./complexity-badge";

interface DependencyGraphProps {
  tasks: BreakdownTask[];
}

export function DependencyGraph({ tasks }: DependencyGraphProps) {
  const layout = useMemo(() => buildGraphLayout(tasks), [tasks]);

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground">
        <GitBranch className="size-8" />
        <p className="text-sm">No tasks to visualize yet</p>
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-xl border border-border bg-card p-4">
      <svg
        width={layout.totalWidth}
        height={layout.totalHeight}
        className="min-h-[200px]"
      >
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 8 8"
            refX="8"
            refY="4"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L0,8 L8,4 z" className="fill-muted-foreground" />
          </marker>
          <marker
            id="arrow-cycle"
            viewBox="0 0 8 8"
            refX="8"
            refY="4"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L0,8 L8,4 z" className="fill-red-500" />
          </marker>
        </defs>

        {/* Edges first so nodes render on top */}
        {layout.edges.map((edge, i) => (
          <path
            key={i}
            d={`M${edge.x1},${edge.y1} C${edge.cx},${edge.y1} ${edge.cx},${edge.y2} ${edge.x2},${edge.y2}`}
            fill="none"
            strokeWidth={1.5}
            markerEnd={edge.isCycle ? "url(#arrow-cycle)" : "url(#arrow)"}
            className={edge.isCycle ? "stroke-red-500 stroke-dashed" : "stroke-muted-foreground/50"}
            strokeDasharray={edge.isCycle ? "4 3" : undefined}
          />
        ))}

        {layout.nodes.map((node) => (
          <foreignObject
            key={node.id}
            x={node.x}
            y={node.y}
            width={node.width}
            height={node.height}
          >
            <div className="flex h-full flex-col justify-center gap-0.5 overflow-hidden rounded-lg border border-border bg-card px-2 py-1.5 shadow-sm">
              <p className="line-clamp-2 text-xs font-medium leading-tight">
                {node.task.title}
              </p>
              <div className="flex items-center gap-1">
                {node.task.category && (
                  <CategoryBadge category={node.task.category} className="text-[10px] px-1 py-0" />
                )}
                {node.task.complexity && (
                  <ComplexityBadge complexity={node.task.complexity} className="text-[10px] px-1 py-0" />
                )}
              </div>
            </div>
          </foreignObject>
        ))}
      </svg>

      {layout.edges.length === 0 && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          No dependencies detected — tasks can be worked on in parallel.
        </p>
      )}
    </div>
  );
}
