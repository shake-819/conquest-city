import { useState } from 'react';
import type { CSSProperties } from 'react';

export type ResearchNodeView = {
  id: string;
  category: string;
  categoryLabel: string;
  categoryColor: string;
  name: string;
  description: string;
  effectLabel: string;
  cost: { gold: number; wood: number; stone: number; food: number };
  prerequisiteId: string | null;
  prerequisiteName: string | null;
  state: 'locked' | 'available' | 'researching' | 'researched';
  progress: number;
  canAfford: boolean;
};

type ResearchPanelProps = {
  nodes: ResearchNodeView[];
  resources: { gold: number; wood: number; stone: number; food: number };
  researchTimer: number | null;
  onResearch: (nodeId: string) => void;
  onClose: () => void;
};

const panelStyle: CSSProperties = {
  position: 'absolute',
  inset: 'clamp(10px, 3vw, 34px)',
  zIndex: 50,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  overflow: 'hidden',
  color: '#d7e0df',
  fontFamily: '"Trebuchet MS", "Yu Gothic", "Hiragino Kaku Gothic ProN", sans-serif',
  background: 'linear-gradient(145deg, rgba(13, 23, 28, 0.985), rgba(7, 13, 17, 0.99))',
  border: '1px solid rgba(156, 183, 176, 0.28)',
  boxShadow: '0 24px 90px rgba(0, 0, 0, 0.68), inset 0 1px rgba(255,255,255,0.05)',
};

const resourceMeta = [
  { key: 'gold', short: '金', color: '#d6a848' },
  { key: 'wood', short: '木', color: '#a77b58' },
  { key: 'stone', short: '石', color: '#99a6aa' },
  { key: 'food', short: '食', color: '#a5b86b' },
] as const;

const statusMeta: Record<ResearchNodeView['state'], { label: string; color: string }> = {
  locked: { label: '前提未達', color: '#7d898c' },
  available: { label: '着手可能', color: '#b9c97b' },
  researching: { label: '研究中', color: '#d6a848' },
  researched: { label: '完了', color: '#82b8a8' },
};

function formatResource(value: number): string {
  return Math.floor(value).toLocaleString('ja-JP');
}

function formatSeconds(value: number): string {
  const seconds = Math.max(0, Math.ceil(value));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes > 0 ? `${minutes}分 ${String(remainder).padStart(2, '0')}秒` : `${remainder}秒`;
}

function ResourceValue({
  label,
  value,
  color,
  muted = false,
}: {
  label: string;
  value: number;
  color: string;
  muted?: boolean;
}) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'baseline',
      gap: 6,
      color: muted ? '#667276' : color,
      fontVariantNumeric: 'tabular-nums',
      whiteSpace: 'nowrap',
    }}>
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 18,
        height: 18,
        border: `1px solid ${muted ? '#3f494b' : `${color}99`}`,
        color: muted ? '#667276' : color,
        fontSize: 10,
        fontWeight: 900,
        letterSpacing: '-1px',
      }}>
        {label}
      </span>
      <span style={{ fontSize: 12, fontWeight: 800 }}>{formatResource(value)}</span>
    </span>
  );
}

function CostLine({
  cost,
  resources,
  compact = false,
}: {
  cost: ResearchNodeView['cost'];
  resources: ResearchPanelProps['resources'];
  compact?: boolean;
}) {
  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: compact ? '5px 10px' : '8px 14px',
      alignItems: 'center',
    }}>
      {resourceMeta.map((resource) => {
        const amount = cost[resource.key];
        const shortfall = resources[resource.key] < amount;
        return (
          <ResourceValue
            key={resource.key}
            label={resource.short}
            value={amount}
            color={shortfall ? '#b66d66' : resource.color}
            muted={amount === 0}
          />
        );
      })}
    </div>
  );
}

function NodeCard({
  node,
  resources,
  researchTimer,
  onResearch,
}: {
  node: ResearchNodeView;
  resources: ResearchPanelProps['resources'];
  researchTimer: number | null;
  onResearch: ResearchPanelProps['onResearch'];
}) {
  const status = statusMeta[node.state];
  const isActionable = node.state === 'available' && node.canAfford;
  const isResearching = node.state === 'researching';
  const progress = Math.max(0, Math.min(100, node.progress));
  const edgeColor = node.state === 'researched' ? '#82b8a8' : node.categoryColor;

  return (
    <article style={{
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      minHeight: 208,
      padding: '15px 15px 13px',
      background: node.state === 'researched'
        ? 'linear-gradient(160deg, rgba(42, 74, 68, 0.32), rgba(13, 30, 31, 0.68))'
        : node.state === 'locked'
          ? 'linear-gradient(160deg, rgba(19, 27, 30, 0.74), rgba(9, 15, 18, 0.82))'
          : 'linear-gradient(160deg, rgba(35, 49, 51, 0.72), rgba(13, 23, 26, 0.9))',
      border: `1px solid ${node.state === 'locked' ? 'rgba(111, 127, 128, 0.22)' : `${edgeColor}66`}`,
      borderTop: `3px solid ${node.state === 'locked' ? '#485457' : edgeColor}`,
      opacity: node.state === 'locked' ? 0.78 : 1,
      boxShadow: node.state === 'available' && node.canAfford ? `inset 0 0 24px ${node.categoryColor}0c` : 'none',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            marginBottom: 7,
            color: node.state === 'locked' ? '#7d898c' : node.categoryColor,
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: '0.13em',
          }}>
            <span style={{
              width: 7,
              height: 7,
              background: node.state === 'locked' ? '#596568' : node.categoryColor,
              boxShadow: node.state === 'locked' ? 'none' : `0 0 8px ${node.categoryColor}88`,
            }} />
            {node.categoryLabel}
          </div>
          <h3 style={{
            margin: 0,
            color: node.state === 'locked' ? '#929c9c' : '#e3e9e6',
            fontSize: 16,
            lineHeight: 1.25,
            fontWeight: 900,
            letterSpacing: '0.03em',
          }}>
            {node.name}
          </h3>
        </div>
        <span style={{
          flexShrink: 0,
          padding: '4px 7px',
          color: status.color,
          border: `1px solid ${status.color}55`,
          background: `${status.color}12`,
          fontSize: 9,
          fontWeight: 900,
          letterSpacing: '0.08em',
        }}>
          {status.label}
        </span>
      </div>

      <p style={{
        flex: 1,
        minHeight: 34,
        margin: 0,
        color: node.state === 'locked' ? '#758083' : '#aebcbb',
        fontSize: 11,
        lineHeight: 1.65,
      }}>
        {node.description}
      </p>

      <div style={{
        padding: '8px 10px',
        borderLeft: `2px solid ${node.state === 'locked' ? '#4e5a5c' : node.categoryColor}`,
        background: 'rgba(0, 0, 0, 0.2)',
        color: node.state === 'locked' ? '#7e898b' : '#d1dba9',
        fontSize: 11,
        lineHeight: 1.35,
        fontWeight: 800,
      }}>
        {node.effectLabel}
      </div>

      {node.prerequisiteName && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          color: node.state === 'locked' ? '#bd867d' : '#82918e',
          fontSize: 10,
          lineHeight: 1.35,
        }}>
          <span style={{ color: '#8d7771', fontWeight: 900 }}>前提</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {node.prerequisiteName}
          </span>
        </div>
      )}

      {isResearching && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#d6a848', fontSize: 10, fontWeight: 900 }}>
            <span>研究進行</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div style={{ height: 5, background: '#273638', overflow: 'hidden' }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #96712f, #d6a848)',
              transition: 'width 0.3s ease',
            }} />
          </div>
          {researchTimer !== null && (
            <div style={{ color: '#9ca9a6', fontSize: 10 }}>
              完了まで <strong style={{ color: '#e4d2a0' }}>{formatSeconds(researchTimer)}</strong>
            </div>
          )}
        </div>
      )}

      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 10,
        paddingTop: 2,
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ marginBottom: 4, color: '#697779', fontSize: 9, fontWeight: 900, letterSpacing: '0.1em' }}>
            必要資源
          </div>
          <CostLine cost={node.cost} resources={resources} compact />
        </div>
        <button
          type="button"
          onClick={() => {
            if (isActionable) onResearch(node.id);
          }}
          disabled={!isActionable}
          aria-label={node.state === 'available' ? `${node.name}の研究を開始` : `${node.name}は${status.label}`}
          style={{
            flexShrink: 0,
            minWidth: 94,
            minHeight: 34,
            padding: '7px 10px',
            border: `1px solid ${isActionable ? node.categoryColor : '#465154'}`,
            background: isActionable ? `${node.categoryColor}25` : 'rgba(255,255,255,0.035)',
            color: isActionable ? '#e5e8d7' : '#667174',
            cursor: isActionable ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: '0.04em',
          }}
        >
          {node.state === 'researched' ? '研究済み' : node.state === 'researching' ? '進行中' : node.state === 'locked' ? 'ロック中' : node.canAfford ? '研究開始' : '資源不足'}
        </button>
      </div>
    </article>
  );
}

export function ResearchPanel({
  nodes,
  resources,
  researchTimer,
  onResearch,
  onClose,
}: ResearchPanelProps) {
  const categories = nodes.reduce<ResearchNodeView[][]>((groups, node) => {
    const existing = groups.find((group) => group[0]?.category === node.category);
    if (existing) existing.push(node);
    else groups.push([node]);
    return groups;
  }, []);
  const initialCategory = nodes.find((node) => node.state === 'researching')?.category
    ?? categories[0]?.[0]?.category
    ?? '';
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const activeCategory = categories.some((group) => group[0]?.category === selectedCategory)
    ? selectedCategory
    : categories[0]?.[0]?.category ?? '';
  const selectedCategoryNodes = categories.find((group) => group[0]?.category === activeCategory) ?? [];
  const researchedCount = nodes.filter((node) => node.state === 'researched').length;
  const researchingNode = nodes.find((node) => node.state === 'researching');

  return (
    <section role="dialog" aria-modal="true" aria-labelledby="research-panel-title" style={panelStyle}>
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 18,
        padding: '16px clamp(16px, 3vw, 28px) 14px',
        background: 'linear-gradient(90deg, rgba(20, 38, 39, 0.95), rgba(12, 22, 26, 0.7))',
        borderBottom: '1px solid rgba(155, 183, 174, 0.22)',
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            marginBottom: 7,
            color: '#9baea8',
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: '0.2em',
          }}>
            <span style={{ width: 24, height: 2, background: '#b18b42' }} />
            本拠地研究局 / 軍需評議
          </div>
          <h2 id="research-panel-title" style={{
            margin: 0,
            color: '#ecf0e6',
            fontSize: 'clamp(20px, 3vw, 29px)',
            lineHeight: 1.1,
            fontWeight: 900,
            letterSpacing: '0.08em',
          }}>
            研究ツリー
          </h2>
          <p style={{ margin: '7px 0 0', color: '#849391', fontSize: 11 }}>
            ひとつの投資が、前線の形を変える。次の戦力を選択してください。
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="研究ツリーを閉じる"
          style={{
            flexShrink: 0,
            width: 38,
            height: 38,
            border: '1px solid rgba(204, 218, 209, 0.32)',
            background: 'rgba(0, 0, 0, 0.24)',
            color: '#c4d0cb',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: 24,
            fontWeight: 300,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </header>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        padding: '10px clamp(16px, 3vw, 28px)',
        background: 'rgba(5, 11, 14, 0.68)',
        borderBottom: '1px solid rgba(155, 183, 174, 0.14)',
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px 18px', alignItems: 'center' }}>
          {resourceMeta.map((resource) => (
            <ResourceValue
              key={resource.key}
              label={resource.short}
              value={resources[resource.key]}
              color={resource.color}
            />
          ))}
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          color: '#849391',
          fontSize: 10,
          fontWeight: 800,
        }}>
          <span><strong style={{ color: '#82b8a8' }}>{researchedCount}</strong> / {nodes.length} 完了</span>
          {researchingNode && (
            <span style={{
              padding: '5px 8px',
              border: '1px solid #a97f38',
              color: '#d6a848',
              background: 'rgba(169, 127, 56, 0.1)',
            }}>
              研究枠 01 稼働中
            </span>
          )}
        </div>
      </div>

      <nav
        aria-label="研究カテゴリ"
        style={{
          display: 'flex',
          gap: 7,
          padding: '10px clamp(12px, 2.5vw, 26px)',
          overflowX: 'auto',
          flexShrink: 0,
          background: 'rgba(8, 16, 19, 0.92)',
          borderBottom: '1px solid rgba(155, 183, 174, 0.18)',
          scrollbarWidth: 'thin',
          scrollbarColor: '#526562 #101a1d',
        }}
      >
        {categories.map((categoryNodes) => {
          const firstNode = categoryNodes[0];
          const categoryResearched = categoryNodes.filter((node) => node.state === 'researched').length;
          const categoryResearching = categoryNodes.some((node) => node.state === 'researching');
          const isSelected = firstNode.category === activeCategory;
          return (
            <button
              key={firstNode.category}
              type="button"
              onClick={() => setSelectedCategory(firstNode.category)}
              aria-pressed={isSelected}
              style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                minWidth: 'max-content',
                minHeight: 40,
                padding: '7px 12px',
                border: `1px solid ${isSelected ? firstNode.categoryColor : 'rgba(155, 183, 174, 0.2)'}`,
                borderBottom: `3px solid ${isSelected ? firstNode.categoryColor : 'transparent'}`,
                background: isSelected ? `${firstNode.categoryColor}18` : 'rgba(255,255,255,0.025)',
                color: isSelected ? '#e5ebe2' : '#879592',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: '0.04em',
                whiteSpace: 'nowrap',
                boxShadow: isSelected ? `inset 0 -7px 16px ${firstNode.categoryColor}0b` : 'none',
              }}
            >
              <span style={{
                width: 8,
                height: 8,
                flexShrink: 0,
                background: firstNode.categoryColor,
                boxShadow: isSelected ? `0 0 8px ${firstNode.categoryColor}` : 'none',
              }} />
              <span>{firstNode.categoryLabel}</span>
              <span style={{
                padding: '2px 5px',
                color: isSelected ? firstNode.categoryColor : '#71807d',
                background: 'rgba(0,0,0,0.22)',
                fontSize: 9,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {categoryResearched}/{categoryNodes.length}
              </span>
              {categoryResearching && (
                <span
                  aria-label="研究中"
                  title="研究中"
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#d6a848',
                    boxShadow: '0 0 8px #d6a848',
                  }}
                />
              )}
            </button>
          );
        })}
      </nav>

      <div style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        padding: '18px clamp(16px, 3vw, 28px) 26px',
        scrollbarColor: '#526562 #101a1d',
      }}>
        {nodes.length === 0 ? (
          <div style={{
            display: 'grid',
            placeItems: 'center',
            minHeight: 250,
            border: '1px dashed rgba(155, 183, 174, 0.24)',
            color: '#849391',
            fontSize: 12,
          }}>
            研究局からの指令がありません。
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {selectedCategoryNodes.length > 0 && (
                <section aria-labelledby={`research-category-${activeCategory}`}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 11,
                    marginBottom: 11,
                  }}>
                    <span style={{
                      width: 4,
                      height: 22,
                      background: selectedCategoryNodes[0].categoryColor,
                      boxShadow: `0 0 11px ${selectedCategoryNodes[0].categoryColor}66`,
                    }} />
                    <h3 id={`research-category-${activeCategory}`} style={{
                      margin: 0,
                      color: '#dbe4de',
                      fontSize: 13,
                      fontWeight: 900,
                      letterSpacing: '0.15em',
                    }}>
                      {selectedCategoryNodes[0].categoryLabel}
                    </h3>
                    <span style={{ color: '#667477', fontSize: 10, fontWeight: 800 }}>
                      {selectedCategoryNodes.length} 計画
                    </span>
                    <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${selectedCategoryNodes[0].categoryColor}55, transparent)` }} />
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
                    gap: 11,
                  }}>
                    {selectedCategoryNodes.map((node) => (
                      <NodeCard
                        key={node.id}
                        node={node}
                        resources={resources}
                        researchTimer={researchTimer}
                        onResearch={onResearch}
                      />
                    ))}
                  </div>
                </section>
            )}
          </div>
        )}
      </div>

      <footer style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 10,
        padding: '9px clamp(16px, 3vw, 28px)',
        borderTop: '1px solid rgba(155, 183, 174, 0.18)',
        background: 'rgba(5, 10, 12, 0.85)',
        color: '#667477',
        fontSize: 10,
        lineHeight: 1.4,
      }}>
        <span>研究は同時に一件のみ。完了まで資源配分を確認してください。</span>
        <span style={{ color: '#8d9c98', fontWeight: 800 }}>戦況に応じて計画を再評価</span>
      </footer>
    </section>
  );
}

export default ResearchPanel;