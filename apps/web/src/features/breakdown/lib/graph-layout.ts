import type { BreakdownTask } from "@/features/task/hooks/use-task-breakdown";

const NODE_W = 180;
const NODE_H = 60;
const H_GAP = 80;
const V_GAP = 20;

export interface GraphNode {
  id: string;
  task: BreakdownTask;
  x: number;
  y: number;
  width: number;
  height: number;
  rank: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  cx: number;
  isCycle: boolean;
}

export interface GraphLayout {
  nodes: GraphNode[];
  edges: GraphEdge[];
  totalWidth: number;
  totalHeight: number;
}

export function buildGraphLayout(tasks: BreakdownTask[]): GraphLayout {
  const titleToId = new Map<string, string>(tasks.map((t) => [t.title, t.id]));

  // Build adjacency: id -> Set of dependency ids
  const deps = new Map<string, Set<string>>();
  for (const t of tasks) {
    const resolved = new Set(
      (t.dependencies ?? [])
        .map((dep) => titleToId.get(dep))
        .filter((id): id is string => id !== undefined && id !== t.id),
    );
    deps.set(t.id, resolved);
  }

  // Build reverse adjacency and in-degree for Kahn's topological sort
  const revAdj = new Map<string, Set<string>>();
  for (const t of tasks) {
    if (!revAdj.has(t.id)) revAdj.set(t.id, new Set());
    for (const depId of deps.get(t.id) ?? []) {
      if (!revAdj.has(depId)) revAdj.set(depId, new Set());
      revAdj.get(depId)!.add(t.id);
    }
  }

  const inDeg = new Map<string, number>(tasks.map((t) => [t.id, deps.get(t.id)?.size ?? 0]));

  const rank = new Map<string, number>();
  const queue: string[] = [];
  for (const t of tasks) {
    if ((inDeg.get(t.id) ?? 0) === 0) queue.push(t.id);
  }

  const processed = new Set<string>();
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (processed.has(id)) continue;
    processed.add(id);
    const maxDepRank = Math.max(
      -1,
      ...[...(deps.get(id) ?? [])].map((d) => rank.get(d) ?? 0),
    );
    rank.set(id, maxDepRank + 1);
    for (const next of revAdj.get(id) ?? []) {
      inDeg.set(next, (inDeg.get(next) ?? 1) - 1);
      if ((inDeg.get(next) ?? 0) <= 0) queue.push(next);
    }
  }
  // Assign rank 0 to any unprocessed (cycle members)
  for (const t of tasks) {
    if (!rank.has(t.id)) rank.set(t.id, 0);
  }

  // Group by rank
  const byRank = new Map<number, string[]>();
  for (const t of tasks) {
    const r = rank.get(t.id) ?? 0;
    if (!byRank.has(r)) byRank.set(r, []);
    byRank.get(r)!.push(t.id);
  }
  const maxRank = Math.max(...byRank.keys());

  const taskById = new Map<string, BreakdownTask>(tasks.map((t) => [t.id, t]));
  const nodes: GraphNode[] = [];
  const nodePos = new Map<string, { x: number; y: number }>();

  for (let r = 0; r <= maxRank; r++) {
    const ids = byRank.get(r) ?? [];
    const x = r * (NODE_W + H_GAP);
    ids.forEach((id, i) => {
      const y = i * (NODE_H + V_GAP);
      nodePos.set(id, { x, y });
      nodes.push({
        id,
        task: taskById.get(id)!,
        x,
        y,
        width: NODE_W,
        height: NODE_H,
        rank: r,
      });
    });
  }

  // Build edges
  const cycleIds = new Set(tasks.filter((t) => !processed.has(t.id)).map((t) => t.id));
  const edges: GraphEdge[] = [];

  for (const t of tasks) {
    const toPos = nodePos.get(t.id);
    if (!toPos) continue;
    for (const depId of deps.get(t.id) ?? []) {
      const fromPos = nodePos.get(depId);
      if (!fromPos) continue;
      const x1 = fromPos.x + NODE_W;
      const y1 = fromPos.y + NODE_H / 2;
      const x2 = toPos.x;
      const y2 = toPos.y + NODE_H / 2;
      edges.push({
        from: depId,
        to: t.id,
        x1,
        y1,
        x2,
        y2,
        cx: (x1 + x2) / 2,
        isCycle: cycleIds.has(t.id) || cycleIds.has(depId),
      });
    }
  }

  const totalWidth = (maxRank + 1) * (NODE_W + H_GAP) - H_GAP + 20;
  const maxNodesInRank = Math.max(...[...byRank.values()].map((ids) => ids.length));
  const totalHeight = maxNodesInRank * (NODE_H + V_GAP) - V_GAP + 20;

  return { nodes, edges, totalWidth, totalHeight };
}
