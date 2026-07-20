"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

interface PlanGeneratorProps {
  initialGoal?: string;
  isGenerating: boolean;
  onGenerate: (goal: string) => void;
  hasPlan?: boolean;
}

export function PlanGenerator({ initialGoal = "", isGenerating, onGenerate, hasPlan }: PlanGeneratorProps) {
  const [goal, setGoal] = useState(initialGoal);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = goal.trim();
    if (trimmed.length < 10 || isGenerating) return;
    onGenerate(trimmed);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  }

  const tooShort = goal.trim().length > 0 && goal.trim().length < 10;
  const canSubmit = goal.trim().length >= 10 && !isGenerating;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div
        className={cn(
          "flex flex-col gap-2 rounded-xl border border-input bg-background p-3",
          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1",
          isGenerating && "opacity-60",
        )}
      >
        <label className="text-xs font-medium text-muted-foreground">
          {hasPlan ? "Regenerate plan — describe a new or updated goal" : "Describe your project goal"}
        </label>
        <textarea
          rows={3}
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isGenerating}
          placeholder="e.g. Build a SaaS invoicing app with Stripe, user auth, PDF exports, and a team dashboard…"
          className="resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
          style={{ touchAction: "manipulation" }}
        />
        <div className="flex items-center justify-between gap-2">
          <p className={cn("text-xs", tooShort ? "text-destructive" : "text-muted-foreground/60")}>
            {tooShort ? "Goal must be at least 10 characters" : `${goal.trim().length}/2000  ·  Ctrl+Enter to generate`}
          </p>
          <Button
            type="submit"
            size="sm"
            disabled={!canSubmit}
            className="gap-1.5 shrink-0"
          >
            <Sparkles className="size-3.5" />
            {isGenerating ? "Generating…" : hasPlan ? "Regenerate" : "Generate Plan"}
          </Button>
        </div>
      </div>
    </form>
  );
}
