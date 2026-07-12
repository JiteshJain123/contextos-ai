"use client";

import { Brain, Sparkles } from "lucide-react";
import { motion } from "motion/react";

import { useMemory } from "../hooks/use-memory";
import { MemoryStatsPanel } from "./memory-stats-panel";
import { ContextBrowser } from "./context-browser";

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="size-3.5 text-primary" />
      </div>
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface MemoryPageProps {
  projectId: string;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function MemoryPage({ projectId }: MemoryPageProps) {
  const memoryQuery = useMemory(projectId);
  const memory = memoryQuery.data ?? null;

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
          <Brain className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Project Memory</h1>
          <p className="text-sm text-muted-foreground">
            AI-powered knowledge base built from your project data
          </p>
        </div>
        {memory && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="ml-auto flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1"
          >
            <Sparkles className="size-3 text-primary" />
            <span className="text-xs font-medium text-primary">
              {memory.totalChunks} chunks indexed
            </span>
          </motion.div>
        )}
      </div>

      {/* Main layout — wider sidebar for better readability */}
      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        {/* ── Left: memory stats + rebuild ── */}
        <div className="flex flex-col gap-4">
          <MemoryStatsPanel
            projectId={projectId}
            memory={memory}
            isLoading={memoryQuery.isLoading}
          />
        </div>

        {/* ── Right: context browser or empty state ── */}
        <div className="flex min-h-0 flex-col gap-4">
          {memory && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
            >
              <SectionHeader
                icon={Brain}
                title="Knowledge Browser"
                subtitle="Browse all indexed content by type"
              />
              <ContextBrowser memory={memory} />
            </motion.div>
          )}

          {!memory && !memoryQuery.isLoading && (
            <div className="flex flex-col items-center justify-center gap-5 rounded-xl border border-dashed border-border px-6 py-16 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/8">
                <Brain className="size-7 text-primary/60" />
              </div>
              <div className="max-w-xs">
                <h3 className="text-base font-semibold">No memory built yet</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Click <strong className="text-foreground">Build Memory</strong> to index your tasks,
                  documents, insights, and conversations into a searchable knowledge base.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 text-left sm:grid-cols-3">
                {[
                  { emoji: "🔍", text: "Semantic search" },
                  { emoji: "🧠", text: "AI context injection" },
                  { emoji: "📂", text: "Browse by category" },
                ].map(({ emoji, text }) => (
                  <div
                    key={text}
                    className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground"
                  >
                    <span>{emoji}</span>
                    {text}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
