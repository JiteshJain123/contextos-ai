"use client";

import { MessageSquare, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import type { ConversationDTO } from "@/lib/validators/ai";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/cn";

import { useCreateConversation } from "../hooks/use-create-conversation";
import { useDeleteConversation } from "../hooks/use-delete-conversation";

/**
 * Left panel: list of conversations for a project + a "New chat" button.
 *
 * Each item shows the title, message count badge, and relative timestamp.
 * Delete uses a ConfirmDialog (not window.confirm) so the flow is
 * non-blocking and consistent with the rest of the app.
 */
export function ConversationList({
  projectId,
  conversations,
  activeId,
  onSelect,
  onDeleted,
}: {
  projectId: string;
  conversations: ConversationDTO[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDeleted?: (deletedId: string) => void;
}) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const createMutation = useCreateConversation(projectId, (conv) => onSelect(conv.id));
  const deleteMutation = useDeleteConversation(projectId, () => {
    if (pendingDeleteId) onDeleted?.(pendingDeleteId);
    setPendingDeleteId(null);
  });

  const pendingConversation = conversations.find((c) => c.id === pendingDeleteId);

  return (
    <>
      <aside
        className="flex w-56 max-w-[85vw] shrink-0 flex-col border-r border-border/60 bg-muted/20 dark:bg-background/30"
        aria-label="Conversations"
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-3.5 text-muted-foreground/60" aria-hidden="true" />
            <span className="text-xs font-semibold tracking-wide text-muted-foreground">
              Chats
            </span>
            {conversations.length > 0 && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground/70">
                {conversations.length}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="New conversation"
            title="New conversation"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
          >
            <Plus className="size-3.5" aria-hidden="true" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto py-1.5">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-3 py-10 text-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                <MessageSquare className="size-4.5 text-muted-foreground/40" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">No chats yet</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground/50">
                  Start a conversation to get help
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Starting…" : "New chat"}
              </Button>
            </div>
          ) : (
            conversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === activeId}
                onSelect={() => onSelect(conv.id)}
                onRequestDelete={() => setPendingDeleteId(conv.id)}
                isDeleting={deleteMutation.isPending && pendingDeleteId === conv.id}
              />
            ))
          )}
        </div>
      </aside>

      {/* Confirmation dialog — renders outside the aside to avoid z-index issues */}
      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
        title="Delete conversation?"
        description={
          pendingConversation ? (
            <>
              Delete{" "}
              <span className="font-medium text-foreground">{pendingConversation.title}</span>?
              All messages will be lost.
            </>
          ) : (
            "All messages in this conversation will be lost."
          )
        }
        confirmLabel="Delete"
        onConfirm={() => {
          if (pendingDeleteId) deleteMutation.mutate(pendingDeleteId);
        }}
        isLoading={deleteMutation.isPending}
      />
    </>
  );
}

function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onRequestDelete,
  isDeleting,
}: {
  conversation: ConversationDTO;
  isActive: boolean;
  onSelect: () => void;
  onRequestDelete: () => void;
  isDeleting: boolean;
}) {
  const messageCount = conversation.messageCount ?? 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      aria-current={isActive ? "true" : undefined}
      className={cn(
        "group relative mx-1 flex cursor-pointer flex-col gap-0.5 rounded-md px-3 py-2 text-sm",
        "transition-all duration-150",
        "hover:bg-accent/60 hover:text-accent-foreground",
        isActive
          ? "bg-accent/70 text-accent-foreground font-medium"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {/* Active left-border indicator */}
      {isActive && (
        <span
          className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-primary"
          aria-hidden="true"
        />
      )}

      <div className="flex items-center gap-2">
        <MessageSquare
          className={cn(
            "size-3 shrink-0 transition-colors",
            isActive ? "text-foreground/70" : "text-muted-foreground/50",
          )}
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1 truncate text-xs leading-snug">{conversation.title}</span>

        {/* Message count badge */}
        {messageCount > 0 && (
          <span
            className={cn(
              "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums transition-colors",
              isActive
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground/60",
            )}
          >
            {messageCount}
          </span>
        )}

        <button
          type="button"
          aria-label={`Delete conversation: ${conversation.title}`}
          onClick={(e) => {
            e.stopPropagation();
            onRequestDelete();
          }}
          disabled={isDeleting}
          className={cn(
            "shrink-0 rounded p-0.5 transition-all hover:text-destructive disabled:cursor-not-allowed",
            "opacity-100 sm:opacity-0 sm:group-hover:opacity-100",
          )}
        >
          <Trash2 className="size-3" aria-hidden="true" />
        </button>
      </div>

      {/* Relative timestamp */}
      <p className="pl-[18px] text-[10px] text-muted-foreground/40">
        {relativeTime(conversation.updatedAt)}
      </p>
    </div>
  );
}

function relativeTime(date: Date | string): string {
  const ms = Date.now() - new Date(date).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
