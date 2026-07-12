"use client";

import { Bot, Check, Copy, User } from "lucide-react";
import { Children, isValidElement, useState } from "react";
import { motion } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { MessageDTO } from "@contextos-ai/validators/ai";

import { cn } from "@/lib/cn";

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function relativeTime(date: Date | string): string {
  const ms = Date.now() - new Date(date).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// â”€â”€â”€ Copy button â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2_000);
    } catch {
      // Clipboard API unavailable (non-HTTPS or denied)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? "Copied!" : "Copy response"}
      className={cn(
        "flex size-6 items-center justify-center rounded-md transition-all",
        "text-muted-foreground/50 hover:bg-muted hover:text-muted-foreground",
        // always visible on mobile touch devices; hover-reveal on desktop
        "opacity-100 sm:opacity-0 sm:group-hover:opacity-100",
        copied && "sm:opacity-100 text-emerald-500",
      )}
    >
      {copied ? (
        <Check className="size-3" aria-hidden="true" />
      ) : (
        <Copy className="size-3" aria-hidden="true" />
      )}
    </button>
  );
}

// â”€â”€â”€ Single message bubble â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Renders one chat message bubble.
 *
 * USER  â†’ right-aligned, primary colour, plain text.
 * ASSISTANT â†’ left-aligned, muted card, full GFM markdown + copy button + timestamp.
 */
export function ChatMessage({
  role,
  content,
  createdAt,
}: {
  role: "USER" | "ASSISTANT";
  content: string;
  createdAt?: Date | string;
}) {
  const isUser = role === "USER";

  return (
    <div className={cn("group flex gap-2.5", isUser ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar */}
      <div
        aria-hidden="true"
        className={cn(
          "mt-1 flex size-7 shrink-0 items-center justify-center rounded-full text-xs",
          isUser
            ? "bg-foreground text-background"
            : "border border-border/60 bg-muted text-muted-foreground",
        )}
      >
        {isUser ? (
          <User className="size-3.5" />
        ) : (
          <Bot className="size-3.5" />
        )}
      </div>

      {/* Bubble + meta row */}
      <div className={cn("flex min-w-0 flex-col gap-1", isUser ? "items-end" : "items-start")}>
        {/* Message bubble */}
        <div
          className={cn(
            "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed sm:max-w-[78%]",
            isUser
              ? "rounded-tr-sm bg-foreground text-background"
              : "rounded-tl-sm border border-border/50 bg-muted/60 text-foreground dark:bg-muted/80",
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{content}</p>
          ) : (
            <MarkdownContent content={content} />
          )}
        </div>

        {/* Footer: timestamp + copy (assistant only) */}
        <div
          className={cn(
            "flex items-center gap-1.5 px-1",
            isUser ? "flex-row-reverse" : "flex-row",
          )}
        >
          {createdAt && (
            <span
              className={cn(
                "text-[10px] text-muted-foreground/40 transition-opacity",
                "opacity-100 sm:opacity-0 sm:group-hover:opacity-100",
              )}
            >
              {relativeTime(createdAt)}
            </span>
          )}
          {!isUser && <CopyButton text={content} />}
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ Streaming placeholder â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Animated placeholder shown while the AI is streaming chunks. */
export function StreamingMessage({ content }: { content: string }) {
  return (
    <motion.div
      className="flex flex-row gap-2.5"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      aria-live="polite"
      aria-label={content ? "AI is responding" : "AI is thinking"}
    >
      {/* Avatar with animated ring while streaming */}
      <div className="relative mt-1 shrink-0">
        <div
          aria-hidden="true"
          className="flex size-7 items-center justify-center rounded-full border border-primary/30 bg-muted text-muted-foreground"
        >
          <Bot className="size-3.5" />
        </div>
        {/* Pulsing ring to signal active generation */}
        <span
          className="absolute -inset-0.5 animate-ping rounded-full border border-primary/30 opacity-50"
          aria-hidden="true"
        />
      </div>

      <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-border/50 bg-muted/60 px-4 py-2.5 text-sm leading-relaxed text-foreground dark:bg-muted/80 sm:max-w-[78%]">
        {content ? (
          <span>
            <MarkdownContent content={content} />
            {/* Blinking cursor */}
            <span
              className="ml-0.5 inline-block h-3.5 w-0.5 rounded-full bg-current align-middle"
              style={{ animation: "cursor-blink 1s step-end infinite" }}
              aria-hidden="true"
            />
          </span>
        ) : (
          <TypingDots />
        )}
      </div>
    </motion.div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex h-5 items-center gap-1.5" aria-label="AI is thinking">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 animate-bounce rounded-full bg-muted-foreground/50"
          style={{ animationDelay: `${i * 180}ms`, animationDuration: "1000ms" }}
        />
      ))}
    </span>
  );
}

// â”€â”€â”€ GFM markdown renderer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0 break-words">{children}</p>,
        ul: ({ children }) => (
          <ul className="mb-2 list-disc space-y-1 pl-4 last:mb-0">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-2 list-decimal space-y-1 pl-4 last:mb-0">{children}</ol>
        ),
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        h1: ({ children }) => (
          <h1 className="mb-2 mt-4 text-base font-bold first:mt-0">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="mb-1.5 mt-3 text-sm font-semibold first:mt-0">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="mb-1 mt-2.5 text-sm font-medium first:mt-0">{children}</h3>
        ),
        // Inline code â€” distinct from block code
        code: ({ className, children }) => {
          const isBlock = !!className?.includes("language-");
          return isBlock ? (
            <code className="font-mono text-[12px] text-foreground/90">{children}</code>
          ) : (
            <code className="rounded border border-border/60 bg-background/80 px-1.5 py-0.5 font-mono text-[11px] text-foreground/90 dark:bg-muted/60">
              {children}
            </code>
          );
        },
        // Code block â€” renders language header + copy button + styled pre
        pre: ({ children }) => {
          let lang = "";
          let rawText = "";

          Children.forEach(children, (child) => {
            if (isValidElement(child)) {
              const props = child.props as { className?: string; children?: unknown };
              lang = props.className?.replace("language-", "") ?? "";
              rawText = String(props.children ?? "").trimEnd();
            }
          });

          return (
            <div className="my-3 overflow-hidden rounded-lg border border-border/60 bg-card dark:bg-background/20">
              {/* Language label + copy */}
              <div className="flex items-center justify-between border-b border-border/60 bg-muted/60 px-3 py-1.5 dark:bg-white/5">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                  {lang || "code"}
                </span>
                {rawText && <CopyButton text={rawText} />}
              </div>
              {/* Code content */}
              <pre className="m-0 overflow-x-auto p-3 text-[12px] leading-relaxed">
                {children}
              </pre>
            </div>
          );
        },
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 transition-opacity hover:opacity-75"
          >
            {children}
          </a>
        ),
        blockquote: ({ children }) => (
          <blockquote className="my-2 border-l-2 border-primary/30 pl-3 text-muted-foreground italic">
            {children}
          </blockquote>
        ),
        hr: () => <hr className="my-3 border-border/40" />,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        table: ({ children }) => (
          <div className="my-2 overflow-x-auto rounded-md border border-border/50">
            <table className="w-full border-collapse text-xs">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border-b border-border/50 bg-muted/60 px-3 py-1.5 text-left text-[11px] font-semibold">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border-b border-border/30 px-3 py-1.5 last:border-b-0">{children}</td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

// â”€â”€â”€ Message list â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Converts a persisted MessageDTO array into animated ChatMessage elements. */
export function MessageList({
  messages,
}: {
  messages: Pick<MessageDTO, "id" | "role" | "content" | "createdAt">[];
}) {
  if (messages.length === 0) return null;
  return (
    <div role="log" aria-live="polite" aria-label="Conversation messages" className="contents">
      {messages.map((m, i) => (
        <motion.div
          key={m.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.2,
            // Stagger the first 12 messages for a smooth list-load feel;
            // messages beyond that share a single 0.35s delay so they don't lag.
            delay: i < 12 ? i * 0.035 : 0.35,
            ease: "easeOut",
          }}
        >
          <ChatMessage role={m.role} content={m.content} createdAt={m.createdAt} />
        </motion.div>
      ))}
    </div>
  );
}

