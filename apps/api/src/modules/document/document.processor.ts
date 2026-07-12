/**
 * document.processor.ts
 *
 * Text-extraction pipeline for uploaded documents.
 *
 * Strategy by MIME type:
 *   text/plain | text/markdown          → direct UTF-8 decode
 *   application/pdf                     → Gemini Files API (no native dep needed)
 *   application/vnd.openxmlformats…     → mammoth (DOCX → plain text)
 *
 * Returns extracted raw text (may be empty string on failure).
 */

import { readFile } from "node:fs/promises";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import mammoth from "mammoth";

import { logger } from "../../lib/logger.js";

const GEMINI_MODEL = "gemini-2.0-flash-lite";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Simple chunk splitter: splits text into ~2000-char chunks at paragraph boundaries. */
export function chunkText(text: string, maxChunkSize = 2000): string[] {
  if (text.length <= maxChunkSize) return [text];

  const paragraphs = text.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if (current.length + para.length + 2 > maxChunkSize && current.length > 0) {
      chunks.push(current.trim());
      current = para;
    } else {
      current = current ? `${current}\n\n${para}` : para;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks.filter(Boolean);
}

// ── PDF extraction via Gemini Files API ──────────────────────────────────────

async function extractPdfText(filePath: string, apiKey: string): Promise<string> {
  const fileManager = new GoogleAIFileManager(apiKey);

  let uploadedFile: Awaited<ReturnType<typeof fileManager.uploadFile>>;
  try {
    uploadedFile = await fileManager.uploadFile(filePath, {
      mimeType: "application/pdf",
      displayName: "document.pdf",
    });
  } catch (err) {
    logger.error({ err, filePath }, "document.processor: Gemini file upload failed");
    throw new Error("PDF upload to Gemini failed", { cause: err });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  try {
    const result = await model.generateContent([
      {
        fileData: {
          fileUri: uploadedFile.file.uri,
          mimeType: "application/pdf",
        },
      },
      {
        text: "Extract all text content from this PDF document. Return only the raw text content in reading order. Do not add summaries, headings, or commentary. Preserve paragraph breaks with double newlines.",
      },
    ]);

    const text = result.response.text().trim();
    logger.debug({ chars: text.length }, "document.processor: PDF text extracted");
    return text;
  } catch (err) {
    logger.error({ err }, "document.processor: Gemini PDF text extraction failed");
    throw new Error("PDF text extraction failed", { cause: err });
  } finally {
    // Clean up the uploaded file from Gemini's temporary storage
    try {
      await fileManager.deleteFile(uploadedFile.file.name);
    } catch {
      // Non-fatal — Gemini auto-expires files after 48h anyway
    }
  }
}

// ── DOCX extraction via mammoth ───────────────────────────────────────────────

async function extractDocxText(filePath: string): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    if (result.messages.length > 0) {
      logger.debug({ messages: result.messages }, "document.processor: mammoth warnings");
    }
    return result.value.trim();
  } catch (err) {
    logger.error({ err, filePath }, "document.processor: mammoth DOCX extraction failed");
    throw new Error("DOCX text extraction failed", { cause: err });
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface ExtractResult {
  text: string;
  charCount: number;
  chunks: string[];
}

/**
 * Extract plain text from a locally-stored document file.
 *
 * @param filePath  Absolute path to the file on disk.
 * @param mimeType  MIME type of the file.
 * @param apiKey    Gemini API key (required for PDF extraction only).
 */
export async function extractDocumentText(
  filePath: string,
  mimeType: string,
  apiKey: string,
): Promise<ExtractResult> {
  let text: string;

  if (mimeType === "text/plain" || mimeType === "text/markdown") {
    text = await readFile(filePath, "utf-8");
  } else if (mimeType === "application/pdf") {
    text = await extractPdfText(filePath, apiKey);
  } else if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    text = await extractDocxText(filePath);
  } else {
    // Fallback: try to read as UTF-8 text
    try {
      text = await readFile(filePath, "utf-8");
    } catch {
      text = "";
    }
  }

  const chunks = chunkText(text);

  return {
    text,
    charCount: text.length,
    chunks,
  };
}
