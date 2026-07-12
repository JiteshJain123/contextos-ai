"use client";

import { CheckSquare, Loader2, Sparkles, Square } from "lucide-react";
import { useState } from "react";

import type { SuggestedTask } from "@contextos-ai/validators/ai";
import type { TaskPriority } from "@contextos-ai/validators/task";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import { queryKeys } from "@/lib/query-keys";

import { useSuggestTasks } from "../../ai/hooks/use-suggest-tasks";
import { taskApi } from "../api/task.api";
import { PriorityBadge } from "./priority-badge";

export function AiTaskSuggestionsDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestedTask[]>([]);
  const [selected, setSelected] = useState<boolean[]>([]);
  const [creating, setCreating] = useState(false);

  const queryClient = useQueryClient();
  const suggestMutation = useSuggestTasks(projectId);

  function handleOpenChange(val: boolean) {
    setOpen(val);
    if (!val) {
      setPrompt("");
      setSuggestions([]);
      setSelected([]);
      suggestMutation.reset();
    }
  }

  async function handleGenerate() {
    const result = await suggestMutation.mutateAsync(prompt);
    setSuggestions(result.tasks);
    setSelected(result.tasks.map(() => true));
  }

  function toggleItem(i: number) {
    setSelected((prev) => prev.map((v, j) => (j === i ? !v : v)));
  }

  function toggleAll() {
    const allSelected = selected.every(Boolean);
    setSelected(selected.map(() => !allSelected));
  }

  async function handleCreate() {
    const toCreate = suggestions.filter((_, i) => selected[i]);
    if (!toCreate.length) return;

    setCreating(true);
    try {
      await Promise.all(
        toCreate.map((t) =>
          taskApi.create(projectId, {
            title: t.title,
            description: t.description,
            status: "TODO",
            priority: (t.priority ?? "MEDIUM") as TaskPriority,
          }),
        ),
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.task.byProject(projectId) });
      toast.success(`${toCreate.length} task${toCreate.length === 1 ? "" : "s"} created`);
      handleOpenChange(false);
    } catch {
      toast.error("Some tasks couldn't be created. Try again.");
    } finally {
      setCreating(false);
    }
  }

  const selectedCount = selected.filter(Boolean).length;
  const hasSuggestions = suggestions.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Sparkles className="size-3.5" aria-hidden="true" />
          Suggest with AI
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" aria-hidden="true" />
            AI Task Suggestions
          </DialogTitle>
        </DialogHeader>

        {!hasSuggestions ? (
          // ── Prompt phase ──────────────────────────────────────────────
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Describe what you want to accomplish and AI will suggest tasks for your project.
            </p>

            <Textarea
              placeholder="e.g. Build a user authentication system with email and Google OAuth"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              disabled={suggestMutation.isPending}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void handleGenerate();
              }}
            />

            {suggestMutation.isError && (
              <p className="text-xs text-destructive">
                {suggestMutation.error instanceof Error
                  ? suggestMutation.error.message
                  : "Failed to generate suggestions. Try again."}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => void handleGenerate()}
                disabled={!prompt.trim() || suggestMutation.isPending}
                className="gap-1.5"
              >
                {suggestMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" aria-hidden="true" />
                    Generate
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          // ── Suggestions phase ─────────────────────────────────────────
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {selectedCount} of {suggestions.length} selected
              </p>
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {selected.every(Boolean) ? "Deselect all" : "Select all"}
              </button>
            </div>

            <div className="-mx-1 max-h-[320px] space-y-2 overflow-y-auto px-1">
              {suggestions.map((task, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleItem(i)}
                  className={cn(
                    "w-full rounded-lg border p-3 text-left transition-colors",
                    selected[i]
                      ? "border-primary/30 bg-primary/5"
                      : "border-border bg-muted/20 hover:bg-muted/40",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 shrink-0 text-muted-foreground">
                      {selected[i] ? (
                        <CheckSquare className="size-4 text-primary" aria-hidden="true" />
                      ) : (
                        <Square className="size-4" aria-hidden="true" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug">{task.title}</p>
                      {task.description && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {task.description}
                        </p>
                      )}
                      <div className="mt-2">
                        <PriorityBadge priority={(task.priority ?? "MEDIUM") as TaskPriority} />
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSuggestions([]);
                  setSelected([]);
                  suggestMutation.reset();
                }}
              >
                ← Try again
              </Button>
              <Button
                onClick={() => void handleCreate()}
                disabled={selectedCount === 0 || creating}
                className="gap-1.5"
              >
                {creating ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Creating…
                  </>
                ) : (
                  `Create ${selectedCount} task${selectedCount === 1 ? "" : "s"}`
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
