"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, FileText, AlertCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { cn } from "@/lib/cn";
import { queryKeys } from "@/lib/query-keys";

import { documentApi } from "../api/document.api";

// ── Allowed types ─────────────────────────────────────────────────────────────

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
];

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt", ".md"];

function getFileIcon(mimeType: string) {
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.includes("wordprocessingml")) return "DOCX";
  if (mimeType === "text/markdown") return "MD";
  return "TXT";
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface DocumentUploadPanelProps {
  projectId: string;
  onUploadComplete?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DocumentUploadPanel({ projectId, onUploadComplete }: DocumentUploadPanelProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const handleUpload = useCallback(
    async (file: File) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setUploadError(`Unsupported file type. Use: ${ALLOWED_EXTENSIONS.join(", ")}`);
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setUploadError("File too large. Maximum size is 10 MB.");
        return;
      }

      setUploadError(null);
      setUploadingFile(file);
      setProgress(0);

      // Fake progress while upload is in-flight
      const progressInterval = setInterval(() => {
        setProgress((p) => Math.min(p + 8, 85));
      }, 200);

      try {
        await documentApi.uploadDocument(projectId, file);
        clearInterval(progressInterval);
        setProgress(100);

        await queryClient.invalidateQueries({
          queryKey: queryKeys.document.byProject(projectId),
        });

        toast.success(`"${file.name}" uploaded successfully`);
        onUploadComplete?.();
      } catch (err) {
        clearInterval(progressInterval);
        const message = err instanceof Error ? err.message : "Upload failed";
        setUploadError(message);
        toast.error(message);
      } finally {
        setTimeout(() => {
          setUploadingFile(null);
          setProgress(0);
        }, 600);
      }
    },
    [projectId, queryClient, onUploadComplete],
  );

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleUpload(file);
    // Reset input so the same file can be re-selected
    e.target.value = "";
  };

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) void handleUpload(file);
    },
    [handleUpload],
  );

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = () => setIsDragging(false);

  return (
    <div className="flex flex-col gap-3">
      {/* ── Drop zone ── */}
      <div
        role="button"
        tabIndex={uploadingFile ? -1 : 0}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => !uploadingFile && fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !uploadingFile) {
            fileInputRef.current?.click();
          }
        }}
        className={cn(
          "relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 transition-all cursor-pointer",
          isDragging
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border/60 bg-muted/10 hover:border-primary/60 hover:bg-muted/30 dark:border-white/10 dark:hover:border-primary/50",
          uploadingFile && "pointer-events-none",
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_EXTENSIONS.join(",")}
          className="hidden"
          onChange={onFileSelected}
        />

        <AnimatePresence mode="wait">
          {uploadingFile ? (
            <motion.div
              key="uploading"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-3 w-full"
            >
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                <FileText className="size-5 text-primary animate-pulse" />
              </div>
              <div className="flex flex-col items-center gap-1 w-full">
                <p className="text-sm font-medium truncate max-w-[200px]">
                  {uploadingFile.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {getFileIcon(uploadingFile.type)} · {(uploadingFile.size / 1024).toFixed(0)} KB
                </p>
              </div>
              {/* Progress bar */}
              <div className="h-1 w-full max-w-[200px] rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: "easeOut" }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {progress < 100 ? "Uploading…" : "Complete!"}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3"
            >
              <div
                className={cn(
                  "flex size-12 items-center justify-center rounded-xl border border-border/60 transition-colors",
                  isDragging ? "bg-primary/10 border-primary/40" : "bg-muted/60",
                )}
              >
                <Upload
                  className={cn(
                    "size-5 transition-colors",
                    isDragging ? "text-primary" : "text-muted-foreground",
                  )}
                />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold">
                  {isDragging ? "Drop file here" : "Upload a document"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Drag & drop or{" "}
                  <span className="font-medium text-primary underline underline-offset-2">
                    click to browse
                  </span>
                </p>
                <div className="mt-2.5 flex justify-center gap-1">
                  {["PDF", "DOCX", "TXT", "MD"].map((ext) => (
                    <span
                      key={ext}
                      className="rounded border border-border/60 bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                    >
                      {ext}
                    </span>
                  ))}
                  <span className="ml-1 text-[10px] text-muted-foreground/50">· max 10 MB</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Error banner ── */}
      <AnimatePresence>
        {uploadError && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2"
          >
            <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
            <p className="flex-1 text-xs text-destructive">{uploadError}</p>
            <button
              type="button"
              onClick={() => setUploadError(null)}
              className="text-destructive/60 hover:text-destructive"
            >
              <X className="size-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
