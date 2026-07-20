"use client";

import { useCallback, useState } from "react";

export type LiveEventType =
  | "task_created"
  | "task_updated"
  | "task_deleted"
  | "task_status_changed";

export interface LiveEvent {
  id: string;
  type: LiveEventType;
  projectId: string;
  actorId?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  receivedAt: Date;
}

export type PushEventPayload = Omit<LiveEvent, "id" | "receivedAt"> & {
  receivedAt?: Date;
};

export function useLiveEvents(_projectId: string): {
  events: LiveEvent[];
  isConnected: boolean;
  pushEvent: (raw: PushEventPayload) => void;
} {
  const [events] = useState<LiveEvent[]>([]);

  const pushEvent = useCallback((_raw: PushEventPayload) => {
    // No-op: real-time activity feed removed (single-user app)
  }, []);

  return { events, isConnected: false, pushEvent };
}
