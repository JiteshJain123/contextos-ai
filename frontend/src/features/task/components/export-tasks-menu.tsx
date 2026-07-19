"use client";

import { Download } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { useState } from "react";
import { toast } from "sonner";

import type { TaskDTO } from "@/lib/validators/task";

import { Button } from "@/components/ui/button";

import { taskApi } from "../api/task.api";
import { statusMeta, TASK_STATUSES } from "../lib/status";

/**
 * Export the project's tasks as CSV or Markdown. Fetches the latest tasks
 * on demand (not from cache) so the export always reflects the server state.
 */
export function ExportTasksMenu({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const [busy, setBusy] = useState(false);

  async function handleExport(format: "csv" | "md") {
    setBusy(true);
    try {
      const tasks = await taskApi.list(projectId);
      const slugBase = projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const content = format === "csv" ? toCsv(tasks) : toMarkdown(projectName, tasks);
      downloadFile(
        `${slugBase || "project"}-tasks.${format}`,
        content,
        format === "csv" ? "text/csv;charset=utf-8" : "text/markdown;charset=utf-8",
      );
      toast.success(`Exported ${tasks.length} task${tasks.length === 1 ? "" : "s"}`);
    } catch {
      toast.error("Export failed — please try again");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="ghost" size="sm" disabled={busy} aria-label="Export tasks">
          <Download className="size-4" aria-hidden="true" />
          Export
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-40 rounded-lg border border-border bg-popover p-1 text-popover-foreground outline-none"
        >
          <DropdownMenu.Item
            onSelect={() => void handleExport("csv")}
            className="cursor-pointer rounded-md px-3 py-1.5 text-sm outline-none data-[highlighted]:bg-muted"
          >
            Export as CSV
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={() => void handleExport("md")}
            className="cursor-pointer rounded-md px-3 py-1.5 text-sm outline-none data-[highlighted]:bg-muted"
          >
            Export as Markdown
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

// ── Formatters ────────────────────────────────────────────────────────────────

function formatDate(value: Date | string | null): string {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function toCsv(tasks: TaskDTO[]): string {
  const header = "Title,Status,Priority,Start date,Due date,Description";
  const rows = tasks.map((t) =>
    [
      csvEscape(t.title),
      t.status,
      t.priority,
      formatDate(t.startDate),
      formatDate(t.dueDate),
      csvEscape(t.description ?? ""),
    ].join(","),
  );
  return [header, ...rows].join("\n");
}

function toMarkdown(projectName: string, tasks: TaskDTO[]): string {
  const lines: string[] = [`# ${projectName} — tasks`, ""];
  for (const status of TASK_STATUSES) {
    const bucket = tasks
      .filter((t) => t.status === status)
      .sort((a, b) => a.position - b.position);
    if (bucket.length === 0) continue;
    lines.push(`## ${statusMeta[status].label} (${bucket.length})`, "");
    for (const t of bucket) {
      const due = formatDate(t.dueDate);
      const checkbox = status === "DONE" ? "x" : " ";
      lines.push(
        `- [${checkbox}] **${t.title}** — ${t.priority}${due ? ` · due ${due}` : ""}`,
      );
      if (t.description) lines.push(`  ${t.description.replace(/\n/g, "\n  ")}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
