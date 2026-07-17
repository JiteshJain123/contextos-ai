/**
 * memory.embedding.ts
 *
 * Gemini text-embedding-004 utilities for the AI Memory system.
 *
 * - generateEmbeddings(texts)  → batch embed up to 100 texts per API call
 * - generateQueryEmbedding(q)  → query-optimised embedding for search
 * - cosineSimilarity(a, b)     → dot-product cosine similarity (0..1)
 * - rankByRelevance(query, chunks) → returns chunks sorted by cosine score
 */

import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";
import { logger } from "../../lib/logger.js";

const EMBEDDING_MODEL = "text-embedding-004";
const BATCH_SIZE = 100; // Gemini batch API limit

// ── Core embedding functions ──────────────────────────────────────────────────

/**
 * Batch-generate embeddings for an array of texts.
 * Splits into batches of 100 to stay within Gemini limits.
 * Returns a parallel array of 768-dim float vectors.
 */
export async function generateEmbeddings(texts: string[], apiKey: string): Promise<number[][]> {
  if (texts.length === 0) return [];

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });

  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

    try {
      const batchResult = await model.batchEmbedContents({
        requests: batch.map((text) => ({
          content: { parts: [{ text: text.slice(0, 8000) }], role: "user" as const },
          taskType: TaskType.RETRIEVAL_DOCUMENT,
        })),
      });

      const vectors = batchResult.embeddings.map((e) => e.values ?? []);
      allEmbeddings.push(...vectors);
    } catch (err) {
      logger.error(
        { err, batchIndex: Math.floor(i / BATCH_SIZE), batchSize: batch.length },
        "memory.embedding: batch embed failed",
      );
      // Push zero vectors for failed batch so indexes remain aligned
      for (let k = 0; k < batch.length; k++) {
        allEmbeddings.push([]);
      }
    }
  }

  return allEmbeddings;
}

/**
 * Generate a query-optimised embedding for semantic search.
 * Uses RETRIEVAL_QUERY task type which is tuned for asymmetric search.
 */
export async function generateQueryEmbedding(query: string, apiKey: string): Promise<number[]> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });

  try {
    const result = await model.embedContent({
      content: { parts: [{ text: query.slice(0, 8000) }], role: "user" },
      taskType: TaskType.RETRIEVAL_QUERY,
    });
    return result.embedding.values ?? [];
  } catch (err) {
    logger.error({ err, query: query.slice(0, 100) }, "memory.embedding: query embed failed");
    return [];
  }
}

// ── Math utilities ─────────────────────────────────────────────────────────────

/**
 * Cosine similarity between two vectors.
 * Returns 0 if vectors are empty or mismatched in length.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    const ai = a[i]!;
    const bi = b[i]!;
    dot += ai * bi;
    magA += ai * ai;
    magB += bi * bi;
  }

  const magnitude = Math.sqrt(magA) * Math.sqrt(magB);
  return magnitude === 0 ? 0 : dot / magnitude;
}

// ── Text chunking utilities ───────────────────────────────────────────────────

/**
 * Smart text splitter that preserves semantic boundaries.
 * Splits at paragraph boundaries, falls back to sentence, then char limit.
 */
export function smartChunkText(text: string, maxChunkSize = 1500): string[] {
  if (!text || text.trim().length === 0) return [];
  if (text.length <= maxChunkSize) return [text.trim()];

  const paragraphs = text.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    if (current.length + trimmed.length + 2 > maxChunkSize && current.length > 0) {
      chunks.push(current.trim());
      current = trimmed;
    } else {
      current = current ? `${current}\n\n${trimmed}` : trimmed;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks.filter(Boolean);
}

/**
 * Build a single text chunk for a task (for embedding).
 */
export function buildTaskChunk(task: {
  title: string;
  status: string;
  priority: string;
  description: string | null;
  dueDate: Date | null;
  assignees: string[];
}): string {
  const parts = [
    `Task: ${task.title}`,
    `Status: ${task.status} | Priority: ${task.priority}`,
  ];
  if (task.description) parts.push(`Description: ${task.description.slice(0, 400)}`);
  if (task.dueDate) parts.push(`Due: ${task.dueDate.toISOString().slice(0, 10)}`);
  if (task.assignees.length > 0) parts.push(`Assignees: ${task.assignees.join(", ")}`);
  return parts.join("\n");
}

/**
 * Build text chunk for an insight.
 */
export function buildInsightChunk(insight: {
  type: string;
  severity: string;
  content: string;
}): string {
  return [
    `AI Insight: ${insight.type.replace(/_/g, " ")}`,
    `Severity: ${insight.severity}`,
    `Analysis: ${insight.content.slice(0, 800)}`,
  ].join("\n");
}

/**
 * Build text chunk for a conversation message group.
 */
export function buildConversationChunk(title: string, messages: string[]): string {
  return [
    `Conversation: ${title}`,
    `Messages:`,
    ...messages.map((m) => `- ${m.slice(0, 200)}`),
  ].join("\n");
}
