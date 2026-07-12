/**
 * document.service.ts
 *
 * Orchestrates the full document understanding pipeline:
 *
 *   1. Create        — persist DB record after multer stores the file
 *   2. Process       — extract text from the stored file
 *   3. Analyze (SSE) — run Gemini analysis, stream events to the caller
 *   4. Import tasks  — bulk-create suggested tasks onto the board
 *   5. Delete        — soft-delete record + remove file from disk
 */

import { mkdir, unlink, access } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "@contextos-ai/database";

import type {
  DocumentRequirement,
  DocumentDeadline,
  DocumentRisk,
  DocumentSuggestedTask,
  ImportTasksFromDocumentInput,
  DocumentPlan,
} from "@contextos-ai/validators/document";
import type { TaskDTO } from "@contextos-ai/validators/task";

import { NotFoundError, BadRequestError, ServiceUnavailableError } from "../../lib/http-errors.js";
import { logger } from "../../lib/logger.js";
import type { AiProvider } from "../ai/ai.provider.js";
import { documentRepository } from "./document.repository.js";
import { extractDocumentText } from "./document.processor.js";

// ── Config ────────────────────────────────────────────────────────────────────

/** Absolute path to the uploads directory (relative to the API process CWD). */
export function uploadsDir(): string {
  return join(process.cwd(), "uploads");
}

export function projectUploadsDir(projectId: string): string {
  return join(uploadsDir(), projectId);
}

/** Ensure the per-project upload directory exists. */
export async function ensureProjectDir(projectId: string): Promise<string> {
  const dir = projectUploadsDir(projectId);
  await mkdir(dir, { recursive: true });
  return dir;
}

// ── Stream event types ────────────────────────────────────────────────────────

type DocumentStreamEvent =
  | { type: "progress"; stage: "extracting" | "analyzing" | "saving"; message: string }
  | { type: "chunk"; content: string }
  | { type: "done"; documentId: string }
  | { type: "error"; message: string };

type PlanStreamEvent =
  | { type: "plan_progress"; message: string }
  | { type: "plan_chunk"; content: string }
  | { type: "plan_done"; plan: DocumentPlan }
  | { type: "plan_error"; message: string };

// ── AI analysis JSON structure ────────────────────────────────────────────────

interface AnalysisResult {
  summary: string;
  requirements: DocumentRequirement[];
  deadlines: DocumentDeadline[];
  risks: DocumentRisk[];
  suggestedTasks: DocumentSuggestedTask[];
}

function buildAnalysisPrompt(
  documentText: string,
  projectName: string,
  projectDescription: string | null,
  existingTaskTitles: string[],
): string {
  const truncated = documentText.slice(0, 40_000); // ~10k tokens of content
  const existingSection =
    existingTaskTitles.length > 0
      ? `\nExisting project tasks (do NOT duplicate these):\n${existingTaskTitles.slice(0, 30).map((t) => `- ${t}`).join("\n")}`
      : "";

  return [
    `You are a senior project manager and business analyst analyzing a document for the project "${projectName}".`,
    projectDescription ? `Project context: ${projectDescription}` : null,
    existingSection || null,
    ``,
    `=== DOCUMENT TEXT ===`,
    truncated,
    `=== END DOCUMENT ===`,
    ``,
    `Analyze this document and return a JSON object with exactly this structure:`,
    `{`,
    `  "summary": "string — 3-5 sentence executive summary of the document's purpose and key points",`,
    `  "requirements": [`,
    `    { "text": "string — specific, actionable requirement", "priority": "LOW"|"MEDIUM"|"HIGH"|"CRITICAL" }`,
    `  ],`,
    `  "deadlines": [`,
    `    { "description": "string — what is due", "date": "YYYY-MM-DD or null if ambiguous", "isEstimated": true|false }`,
    `  ],`,
    `  "risks": [`,
    `    { "description": "string — specific risk", "severity": "LOW"|"MEDIUM"|"HIGH"|"CRITICAL", "mitigation": "string — how to mitigate (optional)" }`,
    `  ],`,
    `  "suggestedTasks": [`,
    `    { "title": "string — starts with action verb, ≤80 chars", "description": "string — ≤200 chars", "priority": "LOW"|"MEDIUM"|"HIGH"|"URGENT", "dueDate": "YYYY-MM-DD or null" }`,
    `  ]`,
    `}`,
    ``,
    `Rules:`,
    `- Extract ONLY what is explicitly stated in the document`,
    `- requirements: 3-10 items, actionable and specific`,
    `- deadlines: only include if an actual date or time reference exists`,
    `- risks: identify technical, timeline, scope, and resource risks`,
    `- suggestedTasks: 5-12 tasks that directly implement the document's requirements`,
    `- Task titles must start with action verbs: Create, Build, Implement, Set up, Write, Configure, Design, Test, Deploy, Add`,
    `- Do NOT duplicate existing project tasks`,
    `- Return ONLY valid JSON. No markdown fences. No explanation.`,
  ]
    .filter((l): l is string => l !== null)
    .join("\n");
}

function buildPlanPrompt(
  projectName: string,
  projectDescription: string | null,
  requirements: DocumentRequirement[],
  deadlines: DocumentDeadline[],
  risks: DocumentRisk[],
  suggestedTasks: DocumentSuggestedTask[],
  existingTaskTitles: string[],
): string {
  const reqSection = requirements.length
    ? requirements.map((r, i) => `${i + 1}. [${r.priority}] ${r.text}`).join("\n")
    : "No requirements extracted.";

  const deadlineSection = deadlines.length
    ? deadlines.map((d) => `- ${d.description}${d.date ? ` (${d.isEstimated ? "~" : ""}${d.date})` : ""}`).join("\n")
    : "No deadlines identified.";

  const riskSection = risks.length
    ? risks.map((r) => `- [${r.severity}] ${r.description}${r.mitigation ? ` → Mitigation: ${r.mitigation}` : ""}`).join("\n")
    : "No risks identified.";

  const suggestedSection = suggestedTasks.length
    ? suggestedTasks.map((t, i) => `${i + 1}. [${t.priority}] ${t.title}${t.dueDate ? ` (due ${t.dueDate})` : ""}`).join("\n")
    : "No tasks suggested yet.";

  const existingSection = existingTaskTitles.length
    ? `\nExisting tasks already in project (DO NOT duplicate):\n${existingTaskTitles.slice(0, 20).map((t) => `- ${t}`).join("\n")}`
    : "";

  const today = new Date().toISOString().slice(0, 10);

  return [
    `You are a senior project manager creating a detailed execution plan for "${projectName}".`,
    projectDescription ? `Project context: ${projectDescription}` : null,
    `Today's date: ${today}`,
    existingSection || null,
    ``,
    `=== EXTRACTED REQUIREMENTS ===`,
    reqSection,
    ``,
    `=== DEADLINES & CONSTRAINTS ===`,
    deadlineSection,
    ``,
    `=== RISKS ===`,
    riskSection,
    ``,
    `=== INITIALLY SUGGESTED TASKS ===`,
    suggestedSection,
    ``,
    `=== YOUR TASK ===`,
    `Create a comprehensive, actionable project execution plan. Return a JSON object with exactly this structure:`,
    `{`,
    `  "summary": "string — 3-5 sentence overview of the plan approach, key priorities, and expected timeline",`,
    `  "totalEstimatedDays": number,`,
    `  "tasks": [`,
    `    {`,
    `      "title": "string — action verb + specific outcome, ≤80 chars",`,
    `      "description": "string — 1-2 sentences of what and why, ≤200 chars",`,
    `      "priority": "LOW"|"MEDIUM"|"HIGH"|"URGENT",`,
    `      "startDate": "YYYY-MM-DD or null",`,
    `      "dueDate": "YYYY-MM-DD or null",`,
    `      "estimatedEffort": "string like '2h', '1d', '3d', '1w'",`,
    `      "category": "setup"|"design"|"frontend"|"backend"|"testing"|"deployment"|"documentation"|"other"`,
    `    }`,
    `  ],`,
    `  "milestones": [`,
    `    {`,
    `      "title": "string — milestone name",`,
    `      "description": "string — what is achieved at this milestone",`,
    `      "targetDate": "YYYY-MM-DD",`,
    `      "taskIndices": [array of 0-based task indices that must be done for this milestone]`,
    `    }`,
    `  ],`,
    `  "phases": [`,
    `    {`,
    `      "name": "string — phase name like 'Phase 1: Setup & Design'",`,
    `      "startDate": "YYYY-MM-DD or null",`,
    `      "endDate": "YYYY-MM-DD or null",`,
    `      "taskIndices": [array of 0-based task indices in this phase]`,
    `    }`,
    `  ]`,
    `}`,
    ``,
    `Rules:`,
    `- tasks: 8-20 concrete tasks ordered by recommended execution sequence`,
    `- Each task must have estimatedEffort`,
    `- Derive realistic dates from the deadlines above; if no deadlines exist, spread tasks over ${Math.max(14, requirements.length * 3)} days from today`,
    `- milestones: 2-5 milestones representing major completion points`,
    `- phases: 2-4 phases grouping related tasks (setup, development, testing, deployment)`,
    `- taskIndices must reference valid 0-based indices of the tasks array`,
    `- Do NOT duplicate existing project tasks`,
    `- Return ONLY valid JSON. No markdown fences. No explanation text outside the JSON.`,
  ]
    .filter((l): l is string => l !== null)
    .join("\n");
}

// ── Service factory ───────────────────────────────────────────────────────────

export function createDocumentService(provider: AiProvider, geminiApiKey: string) {
  return {
    /** Return all documents for a project the user owns. */
    async listDocuments(projectId: string, userId: string) {
      await requireProject(projectId, userId);
      return documentRepository.listForProject(projectId, userId);
    },

    /** Find a single document (ownership checked). */
    async getDocument(docId: string, userId: string) {
      const doc = await documentRepository.findOne(docId, userId);
      if (!doc) throw new NotFoundError("Document not found");
      return doc;
    },

    /**
     * Register a new document after multer has written the file to disk.
     * Called by the upload controller immediately after the upload.
     */
    async createDocument(data: {
      projectId: string;
      uploadedById: string;
      filename: string;
      originalName: string;
      mimeType: string;
      size: number;
    }) {
      await requireProject(data.projectId, data.uploadedById);
      return documentRepository.create(data);
    },

    /**
     * Process + Analyze: full SSE pipeline.
     *
     * Stages:
     *   1. Extract text from file (progress event)
     *   2. Call Gemini for structured analysis (chunk events while parsing)
     *   3. Persist results to DB (progress event)
     *   4. Emit done event
     *
     * The caller sends SSE headers before calling this generator.
     */
    async *analyzeDocument(
      docId: string,
      userId: string,
    ): AsyncGenerator<DocumentStreamEvent, void, undefined> {
      const doc = await documentRepository.findOne(docId, userId);
      if (!doc) throw new NotFoundError("Document not found");
      if (doc.status === "PROCESSING") {
        throw new BadRequestError("Document is already being processed");
      }

      // Retrieve existing task titles for deduplication
      const existingTasks = await prisma.task.findMany({
        where: { projectId: doc.projectId, deletedAt: null },
        select: { title: true },
      });
      const existingTitles = existingTasks.map((t) => t.title);

      const project = await prisma.project.findFirst({
        where: { id: doc.projectId, deletedAt: null },
        select: { name: true, description: true },
      });

      const filePath = join(projectUploadsDir(doc.projectId), doc.filename);

      // ── Stage 1: Extract text ────────────────────────────────────────────
      await documentRepository.updateStatus(docId, "PROCESSING");

      yield {
        type: "progress",
        stage: "extracting",
        message: `Extracting text from ${doc.originalName}…`,
      };

      // Declared without initializer — catch branch always returns, so TS can
      // verify definite assignment without the linter flagging a useless "".
      let extractedText: string;
      try {
        const extraction = await extractDocumentText(filePath, doc.mimeType, geminiApiKey);
        extractedText = extraction.text;

        logger.info(
          { docId, chars: extraction.charCount, chunks: extraction.chunks.length },
          "document.service: text extracted",
        );
      } catch (err) {
        logger.error({ err, docId }, "document.service: text extraction failed");
        await documentRepository.saveAnalysis(docId, { status: "FAILED" });
        yield { type: "error", message: "Failed to extract text from the document" };
        return;
      }

      if (!extractedText.trim()) {
        await documentRepository.saveAnalysis(docId, {
          status: "FAILED",
          extractedText: "",
        });
        yield { type: "error", message: "Document appears to be empty or unreadable" };
        return;
      }

      // ── Stage 2: AI analysis ─────────────────────────────────────────────
      yield {
        type: "progress",
        stage: "analyzing",
        message: "AI is analyzing the document…",
      };

      const prompt = buildAnalysisPrompt(
        extractedText,
        project?.name ?? "Untitled project",
        project?.description ?? null,
        existingTitles,
      );

      let rawJson = "";
      try {
        const generator = provider.streamChat({
          history: [],
          userMessage: prompt,
          systemPrompt:
            "You are a precise document analysis AI. You output only valid JSON matching the requested schema. Never include markdown code fences or any text outside the JSON object.",
        });

        let iterResult = await generator.next();
        while (!iterResult.done) {
          const chunk = iterResult.value as string;
          rawJson += chunk;
          yield { type: "chunk", content: chunk };
          iterResult = await generator.next();
        }
      } catch (err) {
        logger.error({ err, docId }, "document.service: AI analysis stream failed");
        await documentRepository.saveAnalysis(docId, {
          status: "FAILED",
          extractedText,
        });
        throw new ServiceUnavailableError("AI analysis failed — check server logs");
      }

      // ── Stage 3: Parse + save ────────────────────────────────────────────
      yield {
        type: "progress",
        stage: "saving",
        message: "Saving analysis results…",
      };

      let analysisResult: AnalysisResult;
      try {
        const cleaned = rawJson
          .replace(/^```(?:json)?\n?/i, "")
          .replace(/\n?```$/i, "")
          .trim();
        analysisResult = JSON.parse(cleaned) as AnalysisResult;
      } catch {
        logger.error({ docId, rawJsonHead: rawJson.slice(0, 200) }, "document.service: JSON parse failed");
        await documentRepository.saveAnalysis(docId, {
          status: "FAILED",
          extractedText,
        });
        yield { type: "error", message: "AI returned malformed analysis — please retry" };
        return;
      }

      await documentRepository.saveAnalysis(docId, {
        status: "READY",
        extractedText,
        summary: analysisResult.summary ?? "",
        requirements: analysisResult.requirements ?? [],
        deadlines: analysisResult.deadlines ?? [],
        risks: analysisResult.risks ?? [],
        suggestedTasks: analysisResult.suggestedTasks ?? [],
        processedAt: new Date(),
      });

      // Update the project's AiContextCache with document summaries
      await updateContextCache(doc.projectId, analysisResult.summary).catch((err) => {
        logger.warn({ err, projectId: doc.projectId }, "document.service: context cache update failed (non-fatal)");
      });

      logger.info({ docId }, "document.service: analysis complete");
      yield { type: "done", documentId: docId };
    },

    /**
     * Import selected suggested tasks onto the project board.
     */
    async importTasks(
      docId: string,
      userId: string,
      input: ImportTasksFromDocumentInput,
    ): Promise<TaskDTO[]> {
      const doc = await documentRepository.findOne(docId, userId);
      if (!doc) throw new NotFoundError("Document not found");
      if (doc.status !== "READY") throw new BadRequestError("Document must be analyzed first");

      const allTasks = (doc.suggestedTasksJson ?? []) as DocumentSuggestedTask[];
      const selected = input.taskIndices
        .filter((i) => i < allTasks.length)
        .map((i) => allTasks[i]!);

      if (selected.length === 0) throw new BadRequestError("No valid tasks selected");

      // Find max positions per status bucket
      const maxPositions = await prisma.task.groupBy({
        by: ["status"],
        where: { projectId: doc.projectId, deletedAt: null },
        _max: { position: true },
      });

      const maxByStatus = Object.fromEntries(
        maxPositions.map((r) => [r.status, r._max.position ?? 0]),
      );

      // Insert with incrementing fractional positions
      const created: TaskDTO[] = [];
      let todoOffset = 1;

      for (const t of selected) {
        const base = maxByStatus["TODO"] ?? 0;
        const position = base + todoOffset;
        todoOffset++;

        const task = await prisma.task.create({
          data: {
            projectId: doc.projectId,
            createdById: userId,
            title: t.title.slice(0, 200),
            description: t.description?.slice(0, 5000),
            priority: (["LOW", "MEDIUM", "HIGH", "URGENT"] as const).includes(
              t.priority as never,
            )
              ? (t.priority as "LOW" | "MEDIUM" | "HIGH" | "URGENT")
              : "MEDIUM",
            status: "TODO",
            dueDate: t.dueDate ? new Date(t.dueDate) : null,
            position,
          },
        });

        created.push({
          id: task.id,
          projectId: task.projectId,
          createdById: task.createdById,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          startDate: task.startDate,
          dueDate: task.dueDate,
          position: task.position,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
        });
      }

      return created;
    },

    /**
     * Generate a full project plan from an analyzed document — SSE stream.
     *
     * Requires the document to be in READY status (already analyzed).
     * Streams plan_progress → plan_chunk* → plan_done (with full plan JSON).
     */
    async *generatePlan(
      docId: string,
      userId: string,
    ): AsyncGenerator<PlanStreamEvent, void, undefined> {
      const doc = await documentRepository.findOne(docId, userId);
      if (!doc) throw new NotFoundError("Document not found");
      if (doc.status !== "READY") {
        throw new BadRequestError("Document must be analyzed before generating a plan. Click Analyze first.");
      }

      const project = await prisma.project.findFirst({
        where: { id: doc.projectId, deletedAt: null },
        select: { name: true, description: true },
      });

      const existingTasks = await prisma.task.findMany({
        where: { projectId: doc.projectId, deletedAt: null },
        select: { title: true },
      });

      const requirements = (doc.requirementsJson ?? []) as DocumentRequirement[];
      const deadlines = (doc.deadlinesJson ?? []) as DocumentDeadline[];
      const risks = (doc.risksJson ?? []) as DocumentRisk[];
      const suggestedTasks = (doc.suggestedTasksJson ?? []) as DocumentSuggestedTask[];

      yield { type: "plan_progress", message: "Generating project plan…" };

      const prompt = buildPlanPrompt(
        project?.name ?? "Untitled project",
        project?.description ?? null,
        requirements,
        deadlines,
        risks,
        suggestedTasks,
        existingTasks.map((t) => t.title),
      );

      let rawJson = "";
      try {
        const generator = provider.streamChat({
          history: [],
          userMessage: prompt,
          systemPrompt:
            "You are a precise project planning AI. You output only valid JSON matching the requested schema. Never include markdown code fences or any text outside the JSON object.",
        });

        let iterResult = await generator.next();
        while (!iterResult.done) {
          const chunk = iterResult.value as string;
          rawJson += chunk;
          yield { type: "plan_chunk", content: chunk };
          iterResult = await generator.next();
        }
      } catch (err) {
        logger.error({ err, docId }, "document.service: plan generation stream failed");
        yield { type: "plan_error", message: "AI plan generation failed — please retry" };
        return;
      }

      let plan: DocumentPlan;
      try {
        const cleaned = rawJson
          .replace(/^```(?:json)?\n?/i, "")
          .replace(/\n?```$/i, "")
          .trim();
        plan = JSON.parse(cleaned) as DocumentPlan;
      } catch {
        logger.error({ docId, rawJsonHead: rawJson.slice(0, 200) }, "document.service: plan JSON parse failed");
        yield { type: "plan_error", message: "AI returned malformed plan — please retry" };
        return;
      }

      logger.info({ docId, taskCount: plan.tasks?.length ?? 0 }, "document.service: plan generated");
      yield { type: "plan_done", plan };
    },

    /** Soft-delete a document and remove the file from disk. */
    async deleteDocument(docId: string, userId: string): Promise<void> {
      const doc = await documentRepository.findOne(docId, userId);
      if (!doc) throw new NotFoundError("Document not found");

      const filePath = join(projectUploadsDir(doc.projectId), doc.filename);
      const deleted = await documentRepository.softDelete(docId, userId);
      if (!deleted) throw new NotFoundError("Document not found");

      // Best-effort file removal — don't fail if already gone
      try {
        await access(filePath);
        await unlink(filePath);
      } catch {
        // File already removed or never existed — that's fine
      }
    },
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function requireProject(projectId: string, userId: string): Promise<void> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: userId, deletedAt: null },
    select: { id: true },
  });
  if (!project) throw new NotFoundError("Project not found");
}

/** Append document summary to the project's AiContextCache. */
async function updateContextCache(projectId: string, summary: string): Promise<void> {
  const existing = await prisma.aiContextCache.findUnique({
    where: { projectId },
    select: { data: true },
  });

  const data = (existing?.data ?? {}) as Record<string, unknown>;
  const docSummaries = (data.documentSummaries ?? []) as string[];
  docSummaries.unshift(summary);
  data.documentSummaries = docSummaries.slice(0, 10); // keep last 10

  await prisma.aiContextCache.upsert({
    where: { projectId },
    create: { projectId, data: data as never, builtAt: new Date() },
    update: { data: data as never, builtAt: new Date() },
  });
}
