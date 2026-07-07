import type { PharmaMap, PharmaNode, PharmaEdge } from "./api";

export interface PathTreeNode {
  id: string;
  label: string;
  edgeLabel?: string;
  children: PathTreeNode[];
}

type OutEdge = { target: string; effect_tr: string; mediated_by?: string | string[] };

const MAX_DEPTH = 5;
const MAX_CHILDREN = 3;
const MAX_FILL_NODES = 10;

function nodeScore(n: PharmaNode): number {
  let s = n.high_yield ? 10 : 0;
  if (n.type === "organ") s += 4;
  if (n.type === "mediator") s += 3;
  if (n.type === "receptor") s += 2;
  if (n.type === "effect") s += 1;
  return s;
}

function edgeAllowed(edge: OutEdge, pathIds: Set<string>): boolean {
  if (!edge.mediated_by) return true;
  const ids = Array.isArray(edge.mediated_by) ? edge.mediated_by : [edge.mediated_by];
  return ids.some((id) => pathIds.has(id));
}

function pickRoot(nodes: PharmaNode[], inDegree: Map<string, number>): string | null {
  const roots = nodes.filter((n) => (inDegree.get(n.id) ?? 0) === 0);
  if (roots.length === 0) {
    const minIn = Math.min(...nodes.map((n) => inDegree.get(n.id) ?? 0));
    const candidates = nodes.filter((n) => (inDegree.get(n.id) ?? 0) === minIn);
    candidates.sort((a, b) => nodeScore(b) - nodeScore(a));
    return candidates[0]?.id ?? null;
  }
  roots.sort((a, b) => nodeScore(b) - nodeScore(a));
  return roots[0].id;
}

function buildSubtree(
  nodeId: string,
  ancestors: Set<string>,
  depth: number,
  visited: Set<string>,
  fillCount: { n: number },
  outEdges: Map<string, OutEdge[]>,
  nodeById: Map<string, PharmaNode>
): PathTreeNode | null {
  if (depth > MAX_DEPTH || fillCount.n >= MAX_FILL_NODES) return null;
  const node = nodeById.get(nodeId);
  if (!node) return null;

  const pathIds = new Set(ancestors);
  pathIds.add(nodeId);

  const children: PathTreeNode[] = [];
  const edges = (outEdges.get(nodeId) ?? []).filter((e) => edgeAllowed(e, pathIds));
  const sorted = [...edges].sort((a, b) => {
    const ta = nodeById.get(a.target);
    const tb = nodeById.get(b.target);
    return nodeScore(tb ?? ({} as PharmaNode)) - nodeScore(ta ?? ({} as PharmaNode));
  });

  for (const e of sorted.slice(0, MAX_CHILDREN)) {
    if (visited.has(e.target)) continue;
    if (fillCount.n >= MAX_FILL_NODES) break;
    visited.add(e.target);
    fillCount.n += 1;
    const nextAncestors = new Set(pathIds);
    const child = buildSubtree(
      e.target,
      nextAncestors,
      depth + 1,
      visited,
      fillCount,
      outEdges,
      nodeById
    );
    if (child) {
      children.push({ ...child, edgeLabel: e.effect_tr });
    } else {
      const tn = nodeById.get(e.target);
      if (tn) {
        children.push({
          id: tn.id,
          label: tn.label_tr,
          edgeLabel: e.effect_tr,
          children: [],
        });
      }
    }
  }

  return {
    id: node.id,
    label: node.label_tr,
    children,
  };
}

function indexEdges(edges: PharmaEdge[]): Map<string, OutEdge[]> {
  const outEdges = new Map<string, OutEdge[]>();
  for (const e of edges) {
    const list = outEdges.get(e.source) ?? [];
    list.push({
      target: e.target,
      effect_tr: e.effect_tr,
      mediated_by: e.mediated_by,
    });
    outEdges.set(e.source, list);
  }
  return outEdges;
}

export function buildPathTree(map: PharmaMap): PathTreeNode | null {
  if (!map.nodes.length || !map.edges.length) return null;

  const nodeById = new Map(map.nodes.map((n) => [n.id, n]));
  const inDegree = new Map<string, number>();
  const outEdges = indexEdges(map.edges);

  for (const n of map.nodes) inDegree.set(n.id, 0);
  for (const e of map.edges) {
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
  }

  const rootId =
    map.path_tree_root && nodeById.has(map.path_tree_root)
      ? map.path_tree_root
      : pickRoot(map.nodes, inDegree);
  if (!rootId) return null;

  const visited = new Set<string>([rootId]);
  const fillCount = { n: 0 };
  const tree = buildSubtree(rootId, new Set(), 0, visited, fillCount, outEdges, nodeById);
  if (!tree || countNodes(tree) < 3) return null;
  return tree;
}

function countNodes(t: PathTreeNode): number {
  return 1 + t.children.reduce((s, c) => s + countNodes(c), 0);
}

export function getFillOrder(tree: PathTreeNode): PathTreeNode[] {
  const order: PathTreeNode[] = [];
  function walk(n: PathTreeNode, isRoot: boolean) {
    if (!isRoot) order.push(n);
    for (const c of n.children) walk(c, false);
  }
  walk(tree, true);
  return order;
}

export function getWalkOrder(tree: PathTreeNode): PathTreeNode[] {
  const order: PathTreeNode[] = [];
  function walk(n: PathTreeNode) {
    order.push(n);
    for (const c of n.children) walk(c);
  }
  walk(tree);
  return order;
}

export function shuffleOptions(correct: string, pool: string[]): string[] {
  const distractors = pool
    .filter((l) => l !== correct)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
  const opts = [correct, ...distractors].sort(() => Math.random() - 0.5);
  return opts.length >= 2 ? opts : [correct, ...pool.filter((l) => l !== correct).slice(0, 1)];
}
