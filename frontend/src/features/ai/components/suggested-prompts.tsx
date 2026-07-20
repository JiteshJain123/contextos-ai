"use client";

import { AlertTriangle, Calendar, Target, TrendingUp } from "lucide-react";

import { cn } from "@/lib/cn";

/**
 * Contextual prompt suggestions for the AI assistant.
 *
 * Two variants:
 *   "grid"  — 2×2 category cards shown in the empty state; reveals the full
 *             breadth of what the assistant can do (task analysis, planning, etc.)
 *   "chips" — horizontally-scrollable pill row shown above the input area for
 *             quick one-click access to the most common questions
 */

const PROMPT_CATEGORIES = [
  {
    icon: Target,
    iconColor: "text-blue-400",
    cardClass: "border-blue-400/20 bg-blue-400/5",
    label: "Work & Priorities",
    prompts: [
      "What should I work on next?",
      "Which tasks are highest priority?",
      "What are the most urgent items?",
    ],
  },
  {
    icon: AlertTriangle,
    iconColor: "text-amber-400",
    cardClass: "border-amber-400/20 bg-amber-400/5",
    label: "Blockers & Risks",
    prompts: [
      "Which tasks are blocked?",
      "Which overdue tasks are most dangerous?",
      "What is slowing this project?",
    ],
  },
  {
    icon: TrendingUp,
    iconColor: "text-emerald-400",
    cardClass: "border-emerald-400/20 bg-emerald-400/5",
    label: "Progress & Reports",
    prompts: [
      "Summarize today's progress",
      "What did the team accomplish this week?",
      "Show me the task completion breakdown",
    ],
  },
  {
    icon: Calendar,
    iconColor: "text-purple-400",
    cardClass: "border-purple-400/20 bg-purple-400/5",
    label: "Planning & Roadmap",
    prompts: [
      "Create a sprint plan for this week",
      "Generate a roadmap for the next 2 weeks",
      "Break the highest priority task into subtasks",
    ],
  },
] as const;

const QUICK_CHIPS = [
  "What should I work on next?",
  "Which tasks are blocked?",
  "Summarize today's progress",
  "Create a sprint plan",
  "Which overdue tasks are most dangerous?",
  "What's slowing this project?",
  "Generate a 2-week roadmap",
  "Who is working on what?",
] as const;

interface SuggestedPromptsProps {
  variant: "grid" | "chips";
  onSelect: (prompt: string) => void;
  className?: string;
}

export function SuggestedPrompts({ variant, onSelect, className }: SuggestedPromptsProps) {
  if (variant === "chips") {
    return (
      <div
        className={cn(
          "flex gap-1.5 overflow-x-auto pb-1",
          // hide scrollbar cross-browser
          "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
          className,
        )}
        role="list"
        aria-label="Quick suggestions"
      >
        {QUICK_CHIPS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onSelect(prompt)}
            className={cn(
              "shrink-0 rounded-full border border-border/60 bg-muted/50",
              "px-3 py-1.5 text-[11px] text-muted-foreground",
              "transition-all duration-150",
              "hover:border-primary/50 hover:bg-primary/8 hover:text-foreground hover:shadow-sm",
              "active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            {prompt}
          </button>
        ))}
      </div>
    );
  }

  // Grid variant — 2-column category cards
  return (
    <div className={cn("grid grid-cols-1 gap-2 sm:grid-cols-2", className)}>
      {PROMPT_CATEGORIES.map(({ icon: Icon, iconColor, cardClass, label, prompts }) => (
        <div
          key={label}
          className={cn(
            "group rounded-xl border p-3 transition-all duration-150",
            "hover:shadow-sm",
            cardClass,
          )}
        >
          <div className="mb-2 flex items-center gap-2">
            <div
              className={cn(
                "flex size-6 items-center justify-center rounded-md border border-current/10 bg-background/70",
                iconColor,
              )}
            >
              <Icon className="size-3.5" aria-hidden="true" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-foreground/60">
              {label}
            </span>
          </div>

          <div className="space-y-0.5">
            {prompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => onSelect(prompt)}
                className={cn(
                  "w-full rounded-lg px-2.5 py-1.5 text-left text-[11px] text-muted-foreground",
                  "transition-all duration-150",
                  "hover:bg-background/80 hover:text-foreground",
                  "active:scale-[0.98]",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                )}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
