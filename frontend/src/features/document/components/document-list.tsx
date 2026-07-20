"use client";

import {
  FileText,
  File,
  Trash2,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import type { DocumentDTO } from "@/lib/validators/document";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

import { useDeleteDocument } from "../hooks/use-documents";

// ─────────────────────────────────────────────────────────────
// File type badge
// ─────────────────────────────────────────────────────────────

function FileTypeBadge({ mimeType }: { mimeType: string }) {
  const label =
    mimeType === "application/pdf"
      ? "PDF"
      : mimeType.includes("wordprocessingml")
        ? "DOCX"
        : mimeType === "text/markdown"
          ? "MD"
          : "TXT";

  const colors =
    label === "PDF"
      ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
      : label === "DOCX"
        ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
        : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";

  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        colors,
      )}
    >
      {label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Status badge
// ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: DocumentDTO["status"] }) {
  if (status === "READY") {
    return (
      <span className="flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400">
        <CheckCircle2 className="size-3" />
        Ready
      </span>
    );
  }

  if (status === "PROCESSING") {
    return (
      <span className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400">
        <Loader2 className="size-3 animate-spin" />
        Processing
      </span>
    );
  }

  if (status === "FAILED") {
    return (
      <span className="flex items-center gap-1 text-[10px] text-red-600 dark:text-red-400">
        <AlertCircle className="size-3" />
        Failed
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
      <Clock className="size-3" />
      Pending
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Document icon
// ─────────────────────────────────────────────────────────────

function DocIcon({ mimeType }: { mimeType: string }) {
  if (
    mimeType === "application/pdf" ||
    mimeType.includes("wordprocessingml")
  ) {
    return <File className="size-5 text-muted-foreground" />;
  }

  return <FileText className="size-5 text-muted-foreground" />;
}

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────

interface DocumentListProps {
  projectId: string;
  documents: DocumentDTO[];
  selectedDocId: string | null;
  onSelect: (doc: DocumentDTO) => void;
  onAnalyze: (doc: DocumentDTO) => void;
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export function DocumentList({
  projectId,
  documents,
  selectedDocId,
  onSelect,
  onAnalyze,
}: DocumentListProps) {
  const deleteDoc = useDeleteDocument(projectId);

  const handleDelete = (
    e: React.MouseEvent<HTMLButtonElement>,
    doc: DocumentDTO,
  ) => {
    e.stopPropagation();

    deleteDoc.mutate(doc.id, {
      onSuccess: () => {
        toast.success(`"${doc.originalName}" deleted`);
      },
      onError: () => {
        toast.error("Failed to delete document");
      },
    });
  };

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-10 text-center">
        <FileText className="size-8 text-muted-foreground/40" />

        <p className="text-sm text-muted-foreground">
          No documents yet
        </p>

        <p className="text-xs text-muted-foreground/60">
          Upload a PDF, DOCX, or text file above
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <AnimatePresence initial={false}>
        {documents.map((doc) => {
          const isSelected = doc.id === selectedDocId;
          const isReady = doc.status === "READY";

          return (
            <motion.div
              key={doc.id}
              layout
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.18 }}
            >
              {/* IMPORTANT:
                  Changed outer button -> div
                  to avoid nested button hydration error
              */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => onSelect(doc)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(doc);
                  }
                }}
                className={cn(
                  "group w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all outline-none",
                  "focus-visible:ring-2 focus-visible:ring-primary/40",
                  isSelected
                    ? "border-primary/40 bg-primary/5"
                    : "border-border bg-card hover:border-border/80 hover:bg-muted/30",
                )}
              >
                {/* Icon */}
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg",
                    isSelected ? "bg-primary/10" : "bg-muted",
                  )}
                >
                  <DocIcon mimeType={doc.mimeType} />
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-medium">
                      {doc.originalName}
                    </p>

                    <FileTypeBadge mimeType={doc.mimeType} />
                  </div>

                  <div className="mt-0.5 flex items-center gap-3">
                    <StatusBadge status={doc.status} />

                    <span className="text-[10px] text-muted-foreground/50">
                      {(doc.size / 1024).toFixed(0)} KB
                    </span>

                    {isReady && doc.suggestedTasks && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                        {Array.isArray(doc.suggestedTasks)
                          ? doc.suggestedTasks.length
                          : 0}{" "}
                        tasks
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {!isReady && doc.status !== "PROCESSING" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAnalyze(doc);
                      }}
                    >
                      <Sparkles className="size-3" />
                      Analyze
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    onClick={(e) => handleDelete(e, doc)}
                    disabled={deleteDoc.isPending}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>

                {/* Selected indicator */}
                {isSelected && (
                  <ChevronRight className="size-4 shrink-0 text-primary" />
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}