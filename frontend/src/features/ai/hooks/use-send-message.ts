"use client";

import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { queryKeys } from "@/lib/query-keys";
import type { ActionPayload } from "@/lib/validators/ai-actions";

import { aiApi } from "../api/ai.api";

export type ContextSource = {
  type: string;
  count: number;
  label: string;
};

/**
 * Manages the streaming chat send flow.
 *
 * Exposes:
 *   send(content)       — start a new stream
 *   retry()             — re-send the last message (after an error)
 *   streamingContent    — partial AI text accumulating in real-time
 *   isStreaming         — true while the SSE stream is open
 *   streamError         — last error message, cleared on the next send
 *   contextSources      — data sources loaded for the current response
 *   ragChunksUsed       — number of memory chunks injected (0 = no memory)
 *   pendingAction       — AI-detected action waiting for user confirmation
 *   clearPendingAction  — dismiss the action preview card
 */
export function useSendMessage(projectId: string, conversationId: string | null) {
  const queryClient = useQueryClient();

  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [contextSources, setContextSources] = useState<ContextSource[]>([]);
  const [ragChunksUsed, setRagChunksUsed] = useState(0);
  const [pendingAction, setPendingAction] = useState<{ payload: ActionPayload; description: string } | null>(null);

  // Store the last sent message so retry() can re-send without the user
  // having to re-type it.
  const lastContentRef = useRef<string>("");

  const send = useCallback(
    async (content: string) => {
      if (!conversationId || isStreaming) return;

      lastContentRef.current = content;
      setIsStreaming(true);
      setStreamingContent("");
      setStreamError(null);
      setPendingAction(null);

      try {
        for await (const event of aiApi.streamChat(conversationId, content)) {
          if (event.type === "context") {
            setContextSources(event.sources);
            setRagChunksUsed(event.ragChunksUsed);
          } else if (event.type === "chunk") {
            setStreamingContent((prev) => prev + event.content);
          } else if (event.type === "action") {
            setPendingAction({ payload: event.payload, description: event.description });
          } else if (event.type === "done") {
            await queryClient.invalidateQueries({
              queryKey: queryKeys.ai.messages(conversationId),
            });
            await queryClient.invalidateQueries({
              queryKey: queryKeys.ai.conversations(projectId),
            });
          } else if (event.type === "error") {
            const msg = event.message ?? "The AI failed to respond";
            setStreamError(msg);
            toast.error(msg);
          }
        }
      } catch {
        const msg = "Connection lost — please try again";
        setStreamError(msg);
        toast.error(msg);
      } finally {
        setIsStreaming(false);
        setStreamingContent("");
      }
    },
    [conversationId, isStreaming, projectId, queryClient],
  );

  const retry = useCallback(() => {
    if (lastContentRef.current) {
      void send(lastContentRef.current);
    }
  }, [send]);

  const clearPendingAction = useCallback(() => setPendingAction(null), []);

  return { send, retry, streamingContent, isStreaming, streamError, contextSources, ragChunksUsed, pendingAction, clearPendingAction };
}
