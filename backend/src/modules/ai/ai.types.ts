/**
 * AI module — shared internal types.
 *
 * These are backend-internal; the public API shapes live in
 * @/validators/ai (ConversationDTO, MessageDTO, etc.).
 */

export interface ChatMessage {
  role: "USER" | "ASSISTANT";
  content: string;
}

/** Document entry included in the rich context (v2). */
export interface RichProjectContextDocument {
  id: string;
  title: string;
  summary: string | null;
  riskCount: number;
  requirementCount: number;
}

/** Insight entry included in the rich context (v2). */
export interface RichProjectContextInsight {
  type: string;
  severity: string;
  contentPreview: string;
}

/**
 * Rich project context assembled by context-builder.service.ts.
 *
 * Replaces the slim ProjectContext — includes overdue analysis, recent
 * activity, plan summary, team data, documents, and AI insights so the
 * system prompt is fully aware of project health and team composition.
 */
export interface RichProjectContext {
  name: string;
  description: string | null;

  // Full task snapshot (up to 60, ordered by relevance)
  tasks: Array<{
    title: string;
    status: string;
    priority: string;
    description: string | null;
    dueDate: Date | null;
  }>;

  // Aggregated counts for quick status overview
  tasksByStatus: {
    todo: number;
    inProgress: number;
    review: number;
    done: number;
  };

  // Derived: tasks past their due date and still open
  overdueTasks: Array<{
    title: string;
    priority: string;
    dueDate: Date;
    daysOverdue: number;
  }>;

  // Derived: URGENT + HIGH tasks not yet DONE
  urgentTasks: Array<{
    title: string;
    status: string;
    dueDate: Date | null;
  }>;

  // Last 15 activity events in the past 24 h
  recentActivity: Array<{
    type: string;
    actorName: string;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
  }>;

  // First 400 chars of the AI-generated plan markdown (or null)
  planSummary: string | null;

  // Workspace member display names
  teamMembers: string[];

  // Project documents with extracted analysis (optional — absent in cached data
  // until the 5-minute TTL expires; prompt builder defaults to [])
  documents?: RichProjectContextDocument[];

  // Latest AI insights for this project (optional — same cache caveat)
  insights?: RichProjectContextInsight[];
}

/** Result returned by the provider once the full response is assembled. */
export interface AiChatResult {
  content: string;
  promptTokens?: number;
  completionTokens?: number;
}
