"use client";

import { useState, useCallback } from "react";
import {
  BookOpen,
  FileText,
  Sparkles,
  ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { DocumentDTO } from "@contextos-ai/validators/document";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { queryKeys } from "@/lib/query-keys";

import { useDocuments } from "../hooks/use-documents";
import { documentApi } from "../api/document.api";
import { DocumentUploadPanel } from "./document-upload-panel";
import { DocumentList } from "./document-list";
import { DocumentAnalysisPanel } from "./document-analysis-panel";
import { DocumentPlanPanel } from "./document-plan-panel";
import { useGeneratePlan } from "../hooks/use-generate-plan";

// ── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-32 animate-pulse rounded-xl bg-muted" />
      <div className="flex flex-col gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface DocumentsPageProps {
  projectId: string;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function DocumentsPage({ projectId }: DocumentsPageProps) {
  const queryClient = useQueryClient();
  const documentsQuery = useDocuments(projectId);

  const [selectedDoc, setSelectedDoc] = useState<DocumentDTO | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [analysisStage, setAnalysisStage] = useState<string | null>(null);
  const [showPlan, setShowPlan] = useState(false);

  const { state: planState, generate: generatePlan, reset: resetPlan } = useGeneratePlan(projectId);

  const documents = documentsQuery.data ?? [];

  // ── Handle analysis ───────────────────────────────────────────────────────

  const handleAnalyze = useCallback(
    async (doc: DocumentDTO) => {
      setSelectedDoc(doc);
      setIsAnalyzing(true);
      setStreamingContent("");
      setAnalysisStage("extracting");

      try {
        for await (const event of documentApi.analyzeDocument(projectId, doc.id)) {
          if (event.type === "progress") {
            setAnalysisStage(event.stage);
          } else if (event.type === "chunk") {
            setStreamingContent((prev) => prev + event.content);
          } else if (event.type === "done") {
            await queryClient.invalidateQueries({
              queryKey: queryKeys.document.byProject(projectId),
            });
            // Refresh the selected document data
            const updated = (await queryClient.fetchQuery({
              queryKey: queryKeys.document.detail(doc.id),
              queryFn: () => documentApi.getDocument(projectId, doc.id),
              staleTime: 0,
            })) as DocumentDTO;
            setSelectedDoc(updated);
            toast.success("Document analyzed successfully");
          } else if (event.type === "error") {
            toast.error(event.message);
          }
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Analysis failed");
      } finally {
        setIsAnalyzing(false);
        setStreamingContent("");
        setAnalysisStage(null);
      }
    },
    [projectId, queryClient],
  );

  const handleSelectDoc = (doc: DocumentDTO) => {
    if (isAnalyzing) return;
    // Refresh doc data from cache
    const cached = documents.find((d) => d.id === doc.id);
    setSelectedDoc(cached ?? doc);
  };

  const handleBackToList = () => {
    setSelectedDoc(null);
    setStreamingContent("");
    setAnalysisStage(null);
    setShowPlan(false);
    resetPlan();
  };

  const handleGeneratePlan = useCallback(
    (doc: DocumentDTO) => {
      setShowPlan(true);
      void generatePlan(doc.id);
    },
    [generatePlan],
  );

  // ── Render: loading ───────────────────────────────────────────────────────

  if (documentsQuery.isLoading) {
    return <LoadingSkeleton />;
  }

  // ── Layout: two-column on large screens ───────────────────────────────────

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <BookOpen className="size-4 text-primary" aria-hidden="true" />
        </div>
        <h1 className="text-lg font-semibold tracking-tight">Document Intelligence</h1>
        {documents.length > 0 && (
          <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">
            {documents.length} file{documents.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className={cn("grid gap-5", selectedDoc ? "lg:grid-cols-[380px_1fr]" : "max-w-2xl")}>
        {/* ── Left column: upload + list ── */}
        <div
          className={cn(
            "flex flex-col gap-4",
            selectedDoc ? "hidden lg:flex" : "flex",
          )}
        >
          {/* Upload panel */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Upload Document
            </p>
            <DocumentUploadPanel projectId={projectId} />
          </div>

          {/* Document list */}
          {documents.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Documents
              </p>
              <DocumentList
                projectId={projectId}
                documents={documents}
                selectedDocId={selectedDoc?.id ?? null}
                onSelect={handleSelectDoc}
                onAnalyze={handleAnalyze}
              />
            </div>
          )}

          {/* Empty state */}
          {documents.length === 0 && (
            <div className="relative overflow-hidden flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border py-14 text-center">
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/3 via-transparent to-transparent"
                aria-hidden="true"
              />
              <div className="relative flex size-12 items-center justify-center rounded-2xl bg-muted shadow-sm">
                <FileText className="size-5 text-muted-foreground/60" aria-hidden="true" />
              </div>
              <div className="relative">
                <h3 className="text-sm font-semibold">No documents yet</h3>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground leading-relaxed">
                  Upload a PDF, DOCX, TXT, or Markdown file. AI will extract requirements,
                  deadlines, risks, and generate tasks.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Right column: analysis panel ── */}
        {selectedDoc && (
          <div className="flex flex-col gap-3">
            {/* Mobile back button */}
            <div className="flex items-center gap-2 lg:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToList}
                className="gap-1 text-xs"
              >
                <ChevronLeft className="size-3.5" />
                Back to list
              </Button>
            </div>

            {/* Doc header */}
            <div className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <FileText className="size-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{selectedDoc.originalName}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedDoc.size / 1024).toFixed(0)} KB ·{" "}
                  {selectedDoc.mimeType === "application/pdf"
                    ? "PDF"
                    : selectedDoc.mimeType.includes("wordprocessingml")
                      ? "DOCX"
                      : selectedDoc.mimeType === "text/markdown"
                        ? "Markdown"
                        : "Text"}
                </p>
              </div>
              {!isAnalyzing && selectedDoc.status !== "READY" && (
                <Button
                  size="sm"
                  onClick={() => void handleAnalyze(selectedDoc)}
                  className="shrink-0 gap-1.5 text-xs"
                >
                  <Sparkles className="size-3.5" />
                  Analyze
                </Button>
              )}
            </div>

            {/* Analysis results */}
            {!showPlan && (
              <DocumentAnalysisPanel
                projectId={projectId}
                document={selectedDoc}
                onReanalyze={() => {
                  resetPlan();
                  setShowPlan(false);
                  void handleAnalyze(selectedDoc);
                }}
                onGeneratePlan={() => handleGeneratePlan(selectedDoc)}
                isAnalyzing={isAnalyzing}
                streamingContent={streamingContent}
                analysisStage={analysisStage}
              />
            )}

            {/* Plan panel — shown after "Generate Plan" is clicked */}
            {showPlan && (
              <DocumentPlanPanel
                projectId={projectId}
                planState={planState}
                onRegenerate={() => handleGeneratePlan(selectedDoc)}
                onDismiss={() => {
                  setShowPlan(false);
                  resetPlan();
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
