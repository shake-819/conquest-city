import type { ResearchNodeView } from './ResearchPanel';

export interface TreeLayoutNode extends ResearchNodeView {
  col: number;
  row: number;
}

export interface TreeEdge {
  id: string;
  from: ResearchNodeView;
  to: ResearchNodeView;
}

export interface TreeLayout {
  nodes: TreeLayoutNode[];
  edges: TreeEdge[];
  colCount: number;
  rowCount: number;
}

/**
 * 上流(前提なし) -> 下流(前提あり) のツリー/フォレストのレイアウトを計算する。
 * - col: 前提チェーンの深さ(0 が最上流)
 * - row: 兄弟ノード同士が重ならないように割り当てる縦位置(葉ノードから順に採番し、
 *        親ノードは子ノードの行の平均を取ることで、接続線が自然にまとまる)
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

  const col = new Map<string, number>();
  const row = new Map<string, number>();
  let nextLeafRow = 0;

  function assignCol(id: string, depth: number) {
    col.set(id, Math.max(depth, col.get(id) ?? 0));
    (childrenOf.get(id) ?? []).forEach((childId) => assignCol(childId, depth + 1));
  }
  roots.forEach((id) => assignCol(id, 0));

  function assignRow(id: string): number {
    const children = childrenOf.get(id) ?? [];
    if (children.length === 0) {
      const r = nextLeafRow;
      nextLeafRow += 1;
      row.set(id, r);
      return r;
    }
    const childRows = children.map(assignRow);
    const r = childRows.reduce((sum, value) => sum + value, 0) / childRows.length;
    row.set(id, r);
    return r;
  }
  roots.forEach(assignRow);

  const layoutNodes: TreeLayoutNode[] = nodes.map((node) => ({
    ...node,
    col: col.get(node.id) ?? 0,
    row: row.get(node.id) ?? 0,
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

  const colCount = layoutNodes.reduce((max, node) => Math.max(max, node.col + 1), 0);
  const rowCount = Math.max(nextLeafRow, 1);

  return { nodes: layoutNodes, edges, colCount, rowCount };
}
