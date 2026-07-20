"use client";

import { useState } from "react";
import { Sparkles, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface GoalInputStepProps {
  isGenerating: boolean;
  onGenerate: (goal: string) => void;
  sprintStart: Date;
  onSprintStartChange: (d: Date) => void;
}

export function GoalInputStep({
  isGenerating,
  onGenerate,
  sprintStart,
  onSprintStartChange,
}: GoalInputStepProps) {
  const [goal, setGoal] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (goal.trim().length < 3) return;
    onGenerate(goal.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="breakdown-goal">Project goal</Label>
        <Textarea
          id="breakdown-goal"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="e.g. Build a user authentication system with email/password login and JWT sessions"
          rows={3}
          disabled={isGenerating}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">
          Describe what you want to build. The AI will generate 8–12 actionable tasks across 4 sprints.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sprint-start" className="flex items-center gap-1.5">
          <CalendarIcon className="size-3.5" />
          Sprint start date
        </Label>
        <input
          id="sprint-start"
          type="date"
          value={sprintStart.toISOString().slice(0, 10)}
          onChange={(e) => onSprintStartChange(new Date(e.target.value))}
          disabled={isGenerating}
          className="h-9 w-48 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
        />
        <p className="text-xs text-muted-foreground">
          Sprint 1 starts on this date; each sprint is 7 days.
        </p>
      </div>

      <Button
        type="submit"
        disabled={isGenerating || goal.trim().length < 3}
        className="self-start gap-1.5"
      >
        <Sparkles className="size-4" />
        {isGenerating ? "Generating…" : "Generate breakdown"}
      </Button>
    </form>
  );
}
