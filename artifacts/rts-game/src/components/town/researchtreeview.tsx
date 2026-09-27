import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import type { ResearchNodeView, ResearchPanelProps } from './ResearchPanel';
import { layoutResearchTree } from './researchTreeLayout';

const COL_WIDTH = 240;
const ROW_HEIGHT = 100;
const NODE_WIDTH = 196;
const NODE_HEIGHT = 76;
const PAD_X = 28;
const PAD_Y = 30;

const statusMeta: Record<ResearchNodeView['state'], { label: string; color: string }> = {
  locked: { label: '前提未達', color: '#7d898c' },
  available: { label: '着手可能', color: '#b9c97b' },
  researching: { label: '研究中', color: '#d6a848' },
  researched: { label: '完了', color: '#82b8a8' },
};

function nodeCenter(node: { col: number; row: number }, edge: 'left' | 'right') {
  const x = PAD_X + node.col * COL_WIDTH + (edge === 'right' ? NODE_WIDTH : 0);
  const y = PAD_Y + node.row * ROW_HEIGHT + NODE_HEIGHT / 2;
  return { x, y };
}

function TreeNodeChip({
  node,
  isSelected,
  onSelect,
}: {
  node: ResearchNodeView & { col: number; row: number };
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const status = statusMeta[node.state];
  const locked = node.state === 'locked';
  const accent = node.state === 'researched' ? '#82b8a8' : node.categoryColor;
  const progress = Math.max(0, Math.min(100, node.progress));

  return (
    <button
      type="button"
      onClick={() => onSelect(node.id)}
      aria-pressed={isSelected}
      style={{
        position: 'absolute',
        left: PAD_X + node.col * COL_WIDTH,
        top: PAD_Y + node.row * ROW_HEIGHT,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 5,
        padding: '9px 12px',
        textAlign: 'left',
        cursor: 'pointer',
        fontFamily: 'inherit',
        color: locked ? '#8a9698' : '#e3e9e6',
        background: node.state === 'researched'
          ? 'linear-gradient(160deg, rgba(42, 74, 68, 0.4), rgba(13, 30, 31, 0.78))'
          : locked
            ? 'linear-gradient(160deg, rgba(19, 27, 30, 0.82), rgba(9, 15, 18, 0.9))'
            : 'linear-gradient(160deg, rgba(35, 49, 51, 0.82), rgba(13, 23, 26, 0.94))',
        border: `1px solid ${isSelected ? accent : locked ? 'rgba(111, 127, 128, 0.28)' : `${accent}66`}`,
        borderLeft: `4px solid ${locked ? '#485457' : accent}`,
        boxShadow: isSelected
          ? `0 0 0 2px ${accent}55, 0 10px 26px rgba(0,0,0,0.5)`
          : '0 4px 14px rgba(0,0,0,0.35)',
        opacity: locked ? 0.72 : 1,
        zIndex: isSelected ? 2 : 1,
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
      }}>
        <span style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontSize: 12.5,
          fontWeight: 900,
          letterSpacing: '0.02em',
        }}>
          {node.name}
        </span>
        {node.state === 'researched' && (
          <span aria-hidden style={{ flexShrink: 0, color: accent, fontSize: 12, fontWeight: 900 }}>✓</span>
        )}
        {locked && (
          <span aria-hidden style={{ flexShrink: 0, color: '#69767a', fontSize: 11 }}>🔒</span>
        )}
      </div>

      {node.state === 'researching' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ height: 4, background: '#273638', overflow: 'hidden' }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #96712f, #d6a848)',
              transition: 'width 0.3s ease',
            }} />
          </div>
          <span style={{ color: '#d6a848', fontSize: 9.5, fontWeight: 800 }}>
            研究中 {Math.round(progress)}%
          </span>
        </div>
      ) : (
        <span style={{
          alignSelf: 'flex-start',
          padding: '2px 6px',
          color: status.color,
          border: `1px solid ${status.color}55`,
          background: `${status.color}12`,
          fontSize: 9,
          fontWeight: 900,
          letterSpacing: '0.06em',
        }}>
          {status.label}
        </span>
      )}
    </button>
  );
}

function connectorPath(from: { col: number; row: number }, to: { col: number; row: number }): string {
  const start = nodeCenter(from, 'right');
  const end = nodeCenter(to, 'left');
  const dx = Math.max((end.x - start.x) * 0.5, 24);
  return `M ${start.x} ${start.y} C ${start.x + dx} ${start.y}, ${end.x - dx} ${end.y}, ${end.x} ${end.y}`;
}

function TreeDetailPanel({
  node,
  resources,
  researchTimer,
  onResearch,
}: {
  node: ResearchNodeView | undefined;
  resources: ResearchPanelProps['resources'];
  researchTimer: number | null;
  onResearch: ResearchPanelProps['onResearch'];
}) {
  const detailStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    width: '100%',
    padding: '16px 18px',
    background: 'linear-gradient(160deg, rgba(20, 32, 35, 0.9), rgba(10, 17, 20, 0.94))',
    border: '1px solid rgba(155, 183, 174, 0.2)',
    borderTop: `3px solid ${node ? (node.state === 'researched' ? '#82b8a8' : node.categoryColor) : '#485457'}`,
  };

  if (!node) {
    return (
      <div style={{ ...detailStyle, alignItems: 'center', justifyContent: 'center', minHeight: 120, color: '#849391', fontSize: 12 }}>
        ツリーからノードを選択してください。
      </div>
    );
  }

  const status = statusMeta[node.state];
  const isActionable = node.state === 'available' && node.canAfford;
  const progress = Math.max(0, Math.min(100, node.progress));

  return (
    <div style={detailStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6,
            color: node.state === 'locked' ? '#7d898c' : node.categoryColor,
            fontSize: 10, fontWeight: 900, letterSpacing: '0.13em',
          }}>
            <span style={{ width: 7, height: 7, background: node.state === 'locked' ? '#596568' : node.categoryColor }} />
            {node.categoryLabel}
          </div>
          <h4 style={{ margin: 0, color: '#e3e9e6', fontSize: 16, fontWeight: 900, lineHeight: 1.25 }}>
            {node.name}
          </h4>
        </div>
        <span style={{
          flexShrink: 0, padding: '4px 7px', color: status.color,
          border: `1px solid ${status.color}55`, background: `${status.color}12`,
          fontSize: 9, fontWeight: 900, letterSpacing: '0.08em',
        }}>
          {status.label}
        </span>
      </div>

      <p style={{ margin: 0, color: '#aebcbb', fontSize: 11.5, lineHeight: 1.7 }}>
        {node.description}
      </p>

      <div style={{
        padding: '8px 10px',
        borderLeft: `2px solid ${node.categoryColor}`,
        background: 'rgba(0, 0, 0, 0.2)',
        color: '#d1dba9',
        fontSize: 11, lineHeight: 1.35, fontWeight: 800,
      }}>
        {node.effectLabel}
      </div>

      {node.prerequisiteName && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#82918e', fontSize: 10 }}>
          <span style={{ color: '#8d9c98', fontWeight: 900 }}>前提</span>
          <span>{node.prerequisiteName}</span>
        </div>
      )}

      {node.state === 'researching' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#d6a848', fontSize: 10, fontWeight: 900 }}>
            <span>研究進行</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div style={{ height: 5, background: '#273638', overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #96712f, #d6a848)', transition: 'width 0.3s ease' }} />
          </div>
          {researchTimer !== null && (
            <div style={{ color: '#9ca9a6', fontSize: 10 }}>
              完了まで <strong style={{ color: '#e4d2a0' }}>{Math.max(0, Math.ceil(researchTimer))}秒</strong>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, paddingTop: 2 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ marginBottom: 4, color: '#697779', fontSize: 9, fontWeight: 900, letterSpacing: '0.1em' }}>
            必要資源
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 10px' }}>
            {(['gold', 'wood', 'stone', 'food'] as const).map((key) => {
              const amount = node.cost[key];
              const shortfall = resources[key] < amount;
              const colors: Record<typeof key, string> = { gold: '#d6a848', wood: '#a77b58', stone: '#99a6aa', food: '#a5b86b' };
              const short: Record<typeof key, string> = { gold: '金', wood: '木', stone: '石', food: '食' };
              if (amount === 0) return null;
              return (
                <span key={key} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 5, color: shortfall ? '#b66d66' : colors[key], fontSize: 11, fontWeight: 800 }}>
                  <span style={{ fontSize: 9 }}>{short[key]}</span>{Math.floor(amount).toLocaleString('ja-JP')}
                </span>
              );
            })}
          </div>
        </div>
        <button
          type="button"
          onClick={() => { if (isActionable) onResearch(node.id); }}
          disabled={!isActionable}
          style={{
            flexShrink: 0, minWidth: 110, minHeight: 36, padding: '8px 12px',
            border: `1px solid ${isActionable ? node.categoryColor : '#465154'}`,
            background: isActionable ? `${node.categoryColor}25` : 'rgba(255,255,255,0.035)',
            color: isActionable ? '#e5e8d7' : '#667174',
            cursor: isActionable ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit', fontSize: 11, fontWeight: 900, letterSpacing: '0.04em',
          }}
        >
          {node.state === 'researched' ? '研究済み' : node.state === 'researching' ? '進行中' : node.state === 'locked' ? 'ロック中' : node.canAfford ? '研究開始' : '資源不足'}
        </button>
      </div>
    </div>
  );
}

export function ResearchTreeView({
  nodes,
  resources,
  researchTimer,
  onResearch,
}: {
  nodes: ResearchNodeView[];
  resources: ResearchPanelProps['resources'];
  researchTimer: number | null;
  onResearch: ResearchPanelProps['onResearch'];
}) {
  const layout = useMemo(() => layoutResearchTree(nodes), [nodes]);
  const defaultSelected = nodes.find((n) => n.state === 'researching')?.id
    ?? nodes.find((n) => n.state === 'available')?.id
    ?? nodes[0]?.id;
  const [selectedId, setSelectedId] = useState<string | undefined>(defaultSelected);
  const activeId = layout.nodes.some((n) => n.id === selectedId) ? selectedId : defaultSelected;
  const selectedNode = layout.nodes.find((n) => n.id === activeId);

  const width = PAD_X * 2 + layout.colCount * COL_WIDTH - (COL_WIDTH - NODE_WIDTH);
  const height = PAD_Y * 2 + layout.rowCount * ROW_HEIGHT - (ROW_HEIGHT - NODE_HEIGHT);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr) 300px',
      gap: 16,
      alignItems: 'start',
    }}>
      <div
        style={{
          position: 'relative',
          minHeight: Math.max(height, 200),
          overflowX: 'auto',
          overflowY: 'hidden',
          background: 'rgba(5, 11, 14, 0.4)',
          border: '1px dashed rgba(155, 183, 174, 0.16)',
          scrollbarColor: '#526562 #101a1d',
        }}
      >
        <div style={{ position: 'relative', width: Math.max(width, 0), height: Math.max(height, 200) }}>
          <svg
            width={width}
            height={height}
            style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}
          >
            {layout.edges.map((edge) => {
              const fromNode = layout.nodes.find((n) => n.id === edge.from.id)!;
              const toNode = layout.nodes.find((n) => n.id === edge.to.id)!;
              const active = edge.to.state === 'researched' || edge.to.state === 'researching';
              const color = active ? (edge.to.state === 'researched' ? '#82b8a8' : '#d6a848') : `${edge.to.categoryColor}55`;
              return (
                <path
                  key={edge.id}
                  d={connectorPath(fromNode, toNode)}
                  fill="none"
                  stroke={color}
                  strokeWidth={active ? 2 : 1.5}
                  strokeDasharray={edge.to.state === 'locked' ? '4 5' : undefined}
                />
              );
            })}
          </svg>
          {layout.nodes.map((node) => (
            <TreeNodeChip
              key={node.id}
              node={node}
              isSelected={node.id === activeId}
              onSelect={setSelectedId}
            />
          ))}
        </div>
      </div>

      <TreeDetailPanel
        node={selectedNode}
        resources={resources}
        researchTimer={researchTimer}
        onResearch={onResearch}
      />
    </div>
  );
}

export default ResearchTreeView;
