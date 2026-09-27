import type { ResearchNodeView } from './ResearchPanel';

export interface TreeLayoutNode extends ResearchNodeView {
  depth: number;
  lane: number;
}

export interface TreeEdge {
  id: string;
  from: ResearchNodeView;
  to: ResearchNodeView;
}

export interface TreeLayout {
  nodes: TreeLayoutNode[];
  edges: TreeEdge[];
  depthCount: number;
  laneCount: number;
}

/**
 * 上流(前提なし) -> 下流(前提あり) のツリー/フォレストのレイアウトを計算する。
 * - depth: 前提チェーンの深さ(0 が最上流 = 画面の一番上)
 * - lane: 兄弟ノード同士が重ならないように割り当てる横位置(葉ノードから順に採番し、
 *        親ノードは子ノードの横位置の平均を取ることで、接続線が自然にまとまる)
 *
 * 1つの前提ノードから複数の子ノードがぶら下がる「分岐」も、
 * 同じ prerequisiteId を持つノードが複数存在するだけで自動的に扱える。
 * 複数の独立したチェーン(ルートが複数)も「フォレスト」として同一ツリー内に並べる。
 */
export function layoutResearchTree(nodes: ResearchNodeView[]): TreeLayout {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const childrenOf = new Map<string, string[]>();
  const roots: string[] = [];

  // 入力順を安定させる(データ定義順 = 意図された表示順とみなす)
  nodes.forEach((node) => {
    const hasKnownPrerequisite = node.prerequisiteId !== null && byId.has(node.prerequisiteId);
    if (hasKnownPrerequisite) {
      const list = childrenOf.get(node.prerequisiteId as string) ?? [];
      list.push(node.id);
      childrenOf.set(node.prerequisiteId as string, list);
    } else {
      roots.push(node.id);
    }
  });

  const depthOf = new Map<string, number>();
  const laneOf = new Map<string, number>();
  let nextLeafLane = 0;

  function assignDepth(id: string, level: number) {
    depthOf.set(id, Math.max(level, depthOf.get(id) ?? 0));
    (childrenOf.get(id) ?? []).forEach((childId) => assignDepth(childId, level + 1));
  }
  roots.forEach((id) => assignDepth(id, 0));

  function assignLane(id: string): number {
    const children = childrenOf.get(id) ?? [];
    if (children.length === 0) {
      const r = nextLeafLane;
      nextLeafLane += 1;
      laneOf.set(id, r);
      return r;
    }
    const childLanes = children.map(assignLane);
    const r = childLanes.reduce((sum, value) => sum + value, 0) / childLanes.length;
    laneOf.set(id, r);
    return r;
  }
  roots.forEach(assignLane);

  const layoutNodes: TreeLayoutNode[] = nodes.map((node) => ({
    ...node,
    depth: depthOf.get(node.id) ?? 0,
    lane: laneOf.get(node.id) ?? 0,
  }));

  const edges: TreeEdge[] = [];
  nodes.forEach((node) => {
    if (node.prerequisiteId && byId.has(node.prerequisiteId)) {
      edges.push({
        id: `${node.prerequisiteId}->${node.id}`,
        from: byId.get(node.prerequisiteId)!,
        to: node,
      });
    }
  });

  const depthCount = layoutNodes.reduce((max, node) => Math.max(max, node.depth + 1), 0);
  const laneCount = Math.max(nextLeafLane, 1);

  return { nodes: layoutNodes, edges, depthCount, laneCount };
}
