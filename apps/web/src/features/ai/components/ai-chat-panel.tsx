"use client";

import {
  AlertCircle,
  Bot,
  Cpu,
  Database,
  FileText,
  Lightbulb,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

import { useConversations } from "../hooks/use-conversations";
import { useMessages } from "../hooks/use-messages";
import { useSendMessage, type ContextSource } from "../hooks/use-send-message";
import { ConversationList } from "./conversation-list";
import { MessageList, StreamingMessage } from "./chat-message";
import { SuggestedPrompts } from "./suggested-prompts";
import { useCreateConversation } from "../hooks/use-create-conversation";
import { ActionPreviewCard } from "./action-preview-card";

/**
 * Full AI chat panel: conversation sidebar + message thread + sticky input.
 *
 * Key behaviours:
 *  - Suggested prompts in empty state (grid) and above input (chips toggle)
 *  - Auto-send: when a prompt is selected with no active conversation, the
 *    panel creates one and sends the message automatically via pendingAfterCreateRef
 *  - Keyboard shortcut: press `/` anywhere on the page to focus the input
 *  - Framer Motion entry animations on messages (see chat-message.tsx)
 *  - Copy + timestamp on AI messages (see chat-message.tsx)
 */
export function AiChatPanel({ projectId }: { projectId: string }) {
  const [selectedConversationId, setActiveConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPromptSuggestions, setShowPromptSuggestions] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Stores a message to be sent immediately after a new conversation is created.
  // Cleared once the send fires so it can't double-send.
  const pendingAfterCreateRef = useRef<string | null>(null);
  // Tracks the previous conversation ID so we can detect the transition null → newId.
  const prevConvIdRef = useRef<string | null>(null);

  const conversationsQuery = useConversations(projectId);
  const activeConversationId = selectedConversationId ?? conversationsQuery.data?.[0]?.id ?? null;

  // Reset scroll-to-bottom strategy when switching conversations
  useEffect(() => {
    isFirstLoad.current = true;
  }, [activeConversationId]);
  const messagesQuery = useMessages(activeConversationId);
  const { send, retry, streamingContent, isStreaming, streamError, contextSources, ragChunksUsed, pendingAction, clearPendingAction } = useSendMessage(
    projectId,
    activeConversationId,
  );
  const createMutation = useCreateConversation(projectId, (conv) =>
    setActiveConversationId(conv.id),
  );

  // ── Auto-send after conversation creation ───────────────────────────────────
  // When activeConversationId transitions from null to a real ID and there is
  // a pending message, send it immediately. This makes "click prompt → auto-send"
  // seamless even though conversation creation is async.
  useEffect(() => {
    const pending = pendingAfterCreateRef.current;
    const wasNull = prevConvIdRef.current === null;

    if (pending && wasNull && activeConversationId && !isStreaming) {
      pendingAfterCreateRef.current = null;
      setInput("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      void send(pending);
    }

    prevConvIdRef.current = activeConversationId;
  }, [activeConversationId, send, isStreaming]);

  // ── When the active conversation is deleted, select next available one ──────
  const handleConversationDeleted = useCallback(
    (deletedId: string) => {
      if (deletedId !== activeConversationId) return;
      const remaining = (conversationsQuery.data ?? []).filter((c) => c.id !== deletedId);
      setActiveConversationId(remaining[0]?.id ?? null);
    },
    [activeConversationId, conversationsQuery.data],
  );

  // ── Scroll to bottom on new messages / streaming chunks ─────────────────────
  // Use "auto" for initial load (instant) and "smooth" for new content
 const isFirstLoad = useRef(true);

useEffect(() => {
  const hasMessages = Boolean(messagesQuery.data?.length);

  if (isFirstLoad.current && hasMessages) {
    bottomRef.current?.scrollIntoView({
      behavior: "instant",
    });

    const timer = setTimeout(() => {
      isFirstLoad.current = false;
    }, 0);

    return () => clearTimeout(timer);
  }

  bottomRef.current?.scrollIntoView({
    behavior: "smooth",
  });
}, [messagesQuery.data, streamingContent]);

  // ── Keyboard shortcut: `/` focuses the input ────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (
        e.key === "/" &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        textareaRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // ── Send logic ───────────────────────────────────────────────────────────────
  async function handleSend(overrideContent?: string) {
    const content = (overrideContent ?? input).trim();
    if (!content || isStreaming) return;

    if (!activeConversationId) {
      // Store content so it auto-sends once the conversation is created.
      pendingAfterCreateRef.current = content;
      createMutation.mutate();
      return;
    }

    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    await send(content);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  function handleTextareaInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  // ── Prompt suggestion handlers ───────────────────────────────────────────────
  function handleEmptyStatePrompt(prompt: string) {
    // No conversation exists — store pending and auto-create
    pendingAfterCreateRef.current = prompt;
    createMutation.mutate();
  }

  function handleQuickPrompt(prompt: string) {
    setShowPromptSuggestions(false);
    if (!activeConversationId) {
      handleEmptyStatePrompt(prompt);
    } else {
      void handleSend(prompt);
    }
  }

  // ── Derived state ────────────────────────────────────────────────────────────
  const conversations = conversationsQuery.data ?? [];
  const messages = messagesQuery.data ?? [];
  const hasActiveConversation = !!activeConversationId;
  const hasMessages = messages.length > 0 || isStreaming;

  return (
    <div className="relative flex h-full min-h-0 overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-shadow hover:shadow-md">
      {/* ── Left: conversation sidebar ──
           Mobile  : absolute overlay, slides in from left, hidden by default.
           md+     : static flex column, always visible.
      */}
      {!conversationsQuery.isError && (
        <div
          className={cn(
            "absolute inset-y-0 left-0 z-20 shrink-0 transition-transform duration-200 ease-out",
            "shadow-xl md:relative md:translate-x-0 md:shadow-none",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <ConversationList
            projectId={projectId}
            conversations={conversations}
            activeId={activeConversationId}
            onSelect={(id) => {
              setActiveConversationId(id);
              setSidebarOpen(false);
            }}
            onDeleted={handleConversationDeleted}
          />
        </div>
      )}

      {/* Mobile backdrop — closes sidebar on tap outside */}
      {sidebarOpen && (
        <div
          className="absolute inset-0 z-10 bg-background/50 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Right: message thread + input ── */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2.5 sm:px-4">
          {/* Mobile: toggle conversation list */}
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Toggle conversations"
            className="-ml-1 shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
          >
            <MessageSquare className="size-4" aria-hidden="true" />
          </button>

          {/* Bot icon + streaming ping */}
          <div className="relative shrink-0">
            <div className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Bot className="size-3.5" aria-hidden="true" />
            </div>
            {isStreaming && (
              <span className="absolute -right-0.5 -top-0.5 flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
            )}
          </div>

          {/* Title */}
          <div className="min-w-0 flex-1">
            <span className="truncate text-sm font-semibold">
              {isStreaming
                ? "Thinking…"
                : (conversations.find((c) => c.id === activeConversationId)?.title ??
                    "AI Assistant")}
            </span>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            {/* Model badge */}
            <span className="hidden items-center gap-1 rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground sm:flex">
              <Cpu className="size-2.5" aria-hidden="true" />
              Gemini Flash
            </span>
            {/* New conversation shortcut */}
            {hasActiveConversation && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                aria-label="New conversation"
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                title="New conversation (Ctrl+N)"
              >
                <Plus className="size-3.5" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>

        {/* Context sources strip — appears after first message send */}
        {contextSources.length > 0 && (
          <ContextSourcesStrip sources={contextSources} ragChunksUsed={ragChunksUsed} />
        )}

        {/* Messages area */}
        <div className="flex-1 space-y-3 overflow-y-auto scroll-smooth px-3 py-4 pb-6 sm:px-4">
          {!hasActiveConversation && !isStreaming ? (
            // ── Full empty state with category grid ──
            <SmartEmptyState
              onSelectPrompt={handleEmptyStatePrompt}
              isCreating={createMutation.isPending}
            />
          ) : messagesQuery.isLoading ? (
            <LoadingSkeleton />
          ) : messagesQuery.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Failed to load messages</AlertTitle>
              <AlertDescription>
                {messagesQuery.error instanceof Error
                  ? messagesQuery.error.message
                  : "Unknown error"}
              </AlertDescription>
            </Alert>
          ) : !hasMessages ? (
            // ── New empty conversation — show chips ──
            <NewConversationHint onSelectPrompt={handleQuickPrompt} />
          ) : (
            <>
              <MessageList messages={messages} />
              {isStreaming && <StreamingMessage content={streamingContent} />}
            </>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Stream error banner */}
        {streamError && (
          <div className="flex items-center gap-3 border-t border-destructive/20 bg-destructive/5 px-3 py-2.5 sm:px-4">
            <AlertCircle className="size-4 shrink-0 text-destructive" aria-hidden="true" />
            <p className="min-w-0 flex-1 text-xs text-destructive">{streamError}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 shrink-0 gap-1.5 text-xs"
              onClick={retry}
              disabled={isStreaming}
            >
              <RefreshCw className="size-3" aria-hidden="true" />
              Retry
            </Button>
          </div>
        )}

        {/* ── Sticky input area ── */}
        <div className="shrink-0 border-t border-border/60 bg-card/95 px-3 py-3 sm:px-4">
          {/* AI action preview card — shown when action is detected, dismissed on confirm or X */}
          {pendingAction && activeConversationId && (
            <ActionPreviewCard
              projectId={projectId}
              conversationId={activeConversationId}
              payload={pendingAction.payload}
              description={pendingAction.description}
              onDismiss={clearPendingAction}
            />
          )}

          {/* Quick prompt chips — toggled by the Sparkles button */}
          {showPromptSuggestions && !isStreaming && (
            <div className="mb-2.5">
              <SuggestedPrompts
                variant="chips"
                onSelect={handleQuickPrompt}
              />
            </div>
          )}

          <div
            className={cn(
              "flex items-end gap-2 rounded-xl border border-border/60 bg-background px-3 py-2",
              "transition-shadow duration-150",
              "focus-within:border-ring/60 focus-within:ring-2 focus-within:ring-ring/20",
              isStreaming && "opacity-60",
            )}
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
              placeholder={
                hasActiveConversation
                  ? "Ask anything… (Enter ↵ to send, Shift+Enter for newline)"
                  : "Ask anything or pick a suggestion above…"
              }
              aria-label="Message input"
              className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 disabled:cursor-not-allowed"
              style={{ touchAction: "manipulation" }}
            />

            <div className="flex shrink-0 items-center gap-1">
              {/* Sparkles toggle — shows/hides quick prompt chips */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPromptSuggestions((v) => !v)}
                disabled={isStreaming}
                title="Suggested prompts"
                aria-label="Toggle suggested prompts"
                aria-pressed={showPromptSuggestions}
                className={cn(
                  "h-8 w-8 p-0 text-muted-foreground transition-colors",
                  showPromptSuggestions && "bg-primary/10 text-primary",
                )}
              >
                <Sparkles className="size-4" aria-hidden="true" />
              </Button>

              {/* Send */}
              <Button
                type="button"
                size="sm"
                onClick={() => void handleSend()}
                disabled={!input.trim() || isStreaming}
                className="h-8 w-8 p-0 transition-opacity disabled:opacity-40"
                aria-label="Send message"
              >
                <Send className="size-3.5" />
              </Button>
            </div>
          </div>

          <div className="mt-1 flex items-center justify-end gap-2">
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
              <kbd className="rounded border border-border/50 bg-muted px-1 py-0.5 font-mono text-[9px]">
                /
              </kbd>
              to focus
            </span>
            <span className="text-muted-foreground/30">·</span>
            <span className="text-[10px] text-muted-foreground/40">AI responses may contain errors</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Empty states ─────────────────────────────────────────────────────────────

/** Shown when no conversation exists. Displays a branded hero + prompt grid. */
function SmartEmptyState({
  onSelectPrompt,
  isCreating,
}: {
  onSelectPrompt: (prompt: string) => void;
  isCreating: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-5 py-4 sm:py-6">
      {/* Brand hero */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="relative">
          <div className="flex size-12 items-center justify-center rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/15 to-primary/5 shadow-sm">
            <Bot className="size-6 text-primary" />
          </div>
          <span
            className="absolute -inset-0.5 rounded-2xl border border-primary/20 opacity-50"
            style={{ animation: "cursor-blink 3s ease-in-out infinite" }}
          />
        </div>
        <div>
          <h3 className="text-sm font-semibold">AI Assistant</h3>
          <p className="mt-1 max-w-[260px] text-xs leading-relaxed text-muted-foreground">
            Ask me about your tasks, blockers, deadlines, documents, or anything else in this project.
          </p>
        </div>
      </div>

      {/* Capability chips */}
      <div className="flex flex-wrap justify-center gap-1.5 px-4">
        {[
          { icon: "📋", text: "Knows all your tasks" },
          { icon: "📄", text: "Reads your documents" },
          { icon: "🧠", text: "Searches project memory" },
          { icon: "⚡", text: "Can create & update tasks" },
        ].map((cap) => (
          <span
            key={cap.text}
            className="flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground"
          >
            {cap.icon} {cap.text}
          </span>
        ))}
      </div>

      {/* Suggested prompts */}
      <div className="w-full">
        <SuggestedPrompts variant="grid" onSelect={onSelectPrompt} />
      </div>

      {isCreating && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <RefreshCw className="size-3 animate-spin" />
          Starting conversation…
        </div>
      )}
    </div>
  );
}

/** Shown when a conversation exists but has no messages yet (brand-new thread). */
function NewConversationHint({
  onSelectPrompt,
}: {
  onSelectPrompt: (prompt: string) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
        <Bot className="size-4 text-primary" />
      </div>
      <p className="text-center text-xs text-muted-foreground max-w-[220px]">
        New conversation — type below or pick a suggestion:
      </p>
      <SuggestedPrompts variant="chips" onSelect={onSelectPrompt} />
    </div>
  );
}

// ─── Context sources strip ────────────────────────────────────────────────────

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  tasks: <Database className="size-2.5" aria-hidden="true" />,
  documents: <FileText className="size-2.5" aria-hidden="true" />,
  insights: <Lightbulb className="size-2.5" aria-hidden="true" />,
  overdue: <TriangleAlert className="size-2.5" aria-hidden="true" />,
  memory: <Sparkles className="size-2.5" aria-hidden="true" />,
  plan: <Database className="size-2.5" aria-hidden="true" />,
};

const SOURCE_COLORS: Record<string, string> = {
  tasks: "bg-muted text-muted-foreground",
  documents: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  insights: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  overdue: "bg-destructive/10 text-destructive",
  memory: "bg-primary/10 text-primary",
  plan: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

/**
 * Compact strip shown below the chat header after the first message send.
 * Lists each data source the AI loaded for the current response.
 */
function ContextSourcesStrip({
  sources,
  ragChunksUsed,
}: {
  sources: ContextSource[];
  ragChunksUsed: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border/40 bg-muted/30 px-3 py-1.5 sm:px-4">
      <span className="shrink-0 text-[9px] font-medium uppercase tracking-wide text-muted-foreground/50">
        Context
      </span>
      {sources.map((src) => (
        <span
          key={src.type}
          className={cn(
            "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-medium",
            SOURCE_COLORS[src.type] ?? "bg-muted text-muted-foreground",
          )}
        >
          {SOURCE_ICONS[src.type]}
          {src.label} {src.count}
        </span>
      ))}
      {ragChunksUsed === 0 && (
        <span className="text-[9px] text-muted-foreground/40" title="Build project memory to enable semantic search">
          · no memory
        </span>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {/* Simulate alternating user/assistant messages */}
      {[
        { isUser: false, w: "w-[72%]", lines: 2 },
        { isUser: true, w: "w-[45%]", lines: 1 },
        { isUser: false, w: "w-[80%]", lines: 3 },
        { isUser: true, w: "w-[38%]", lines: 1 },
      ].map((item, i) => (
        <div
          key={i}
          className={cn("flex gap-2.5", item.isUser ? "flex-row-reverse" : "flex-row")}
        >
          {/* Avatar skeleton */}
          <div className="mt-1 size-7 shrink-0 animate-pulse rounded-full bg-muted" />
          {/* Bubble skeleton */}
          <div
            className={cn(
              "flex flex-col gap-1.5 rounded-2xl px-4 py-3",
              "animate-pulse bg-muted",
              item.w,
            )}
          >
            {Array.from({ length: item.lines }).map((_, li) => (
              <div
                key={li}
                className={cn(
                  "h-2.5 rounded-full bg-muted-foreground/20",
                  li === item.lines - 1 && item.lines > 1 ? "w-2/3" : "w-full",
                )}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
