"use client";

import { AlertCircle, CheckSquare, Loader2 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { BreakdownTask } from "@/features/task/hooks/use-task-breakdown";
import { CATEGORY_META, ALL_CATEGORIES } from "../lib/category-meta";

interface ConfirmImportStepProps {
  tasks: BreakdownTask[];
  selectedTasks: BreakdownTask[];
  onImport: () => Promise<boolean>;
  onBack: () => void;
  isImporting: boolean;
  importError: string | null;
}

const SPRINT_COLORS = ["#6366f1", "#3b82f6", "#8b5cf6", "#06b6d4"];

export function ConfirmImportStep({
  tasks,
  selectedTasks,
  onImport,
  onBack,
  isImporting,
  importError,
}: ConfirmImportStepProps) {
  // Sprint chart data
  const sprintData = [1, 2, 3, 4].map((s) => ({
    name: `Sprint ${s}`,
    count: selectedTasks.filter((t) => (t.sprintOrder ?? 1) === s).length,
  }));

  // Category counts
  const catCounts = ALL_CATEGORIES.map((cat) => ({
    cat,
    count: selectedTasks.filter((t) => (t.category ?? "backend") === cat).length,
  })).filter((c) => c.count > 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold">Ready to import</h2>
        <p className="text-sm text-muted-foreground">
          {selectedTasks.length} of {tasks.length} tasks selected for import.
          Tasks will be created in your board with suggested due dates.
        </p>
      </div>

      {/* Sprint distribution chart */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="mb-3 text-xs font-medium text-muted-foreground">Tasks per sprint</p>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={sprintData} barSize={32}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis hide allowDecimals={false} />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted))" }}
              contentStyle={{
                fontSize: 12,
                borderRadius: 6,
                border: "1px solid hsl(var(--border))",
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {sprintData.map((_, i) => (
                <Cell key={i} fill={SPRINT_COLORS[i]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Category pill counts */}
      {catCounts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {catCounts.map(({ cat, count }) => {
            const meta = CATEGORY_META[cat];
            return (
              <span
                key={cat}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${meta.bg} ${meta.color} ${meta.border}`}
              >
                {meta.label}
                <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-[10px] dark:bg-white/10">
                  {count}
                </span>
              </span>
            );
          })}
        </div>
      )}

      {importError && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Import failed</AlertTitle>
          <AlertDescription>{importError}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={onBack} disabled={isImporting}>
          Back to review
        </Button>
        <Button onClick={onImport} disabled={isImporting || selectedTasks.length === 0} className="gap-1.5">
          {isImporting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Importing…
            </>
          ) : (
            <>
              <CheckSquare className="size-4" />
              Import {selectedTasks.length} task{selectedTasks.length === 1 ? "" : "s"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
