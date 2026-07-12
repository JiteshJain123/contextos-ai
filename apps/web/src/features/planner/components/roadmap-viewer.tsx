"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Edit2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

interface RoadmapViewerProps {
  markdown: string;
  isStreaming?: boolean;
  onSave?: (markdown: string) => void;
  isSaving?: boolean;
}

export function RoadmapViewer({ markdown, isStreaming, onSave, isSaving }: RoadmapViewerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(markdown);

  function handleEdit() {
    setDraft(markdown);
    setIsEditing(true);
  }

  function handleCancel() {
    setDraft(markdown);
    setIsEditing(false);
  }

  async function handleSave() {
    onSave?.(draft);
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <div className="flex flex-col gap-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className={cn(
            "w-full min-h-[400px] resize-y rounded-lg border border-input bg-background",
            "px-3 py-2 text-sm font-mono outline-none",
            "focus:ring-2 focus:ring-ring focus:ring-offset-1",
          )}
          spellCheck={false}
        />
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSaving}>
            <X className="size-3.5 mr-1.5" />
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            <Check className="size-3.5 mr-1.5" />
            {isSaving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative">
      {!isStreaming && onSave && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleEdit}
          className="absolute right-0 top-0 h-8 gap-1.5 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Edit2 className="size-3.5" />
          Edit
        </Button>
      )}
      <div
        className={cn(
          "prose prose-sm dark:prose-invert max-w-none",
          "prose-headings:font-semibold prose-headings:tracking-tight",
          "prose-h2:text-base prose-h3:text-sm",
          "prose-li:my-0.5 prose-ul:my-1 prose-ol:my-1",
          "prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-xs",
          "prose-pre:bg-muted prose-pre:rounded-lg",
          "prose-blockquote:border-l-primary/40",
          isStreaming && "animate-pulse",
        )}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
      </div>
    </div>
  );
}
