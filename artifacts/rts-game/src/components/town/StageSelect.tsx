import { useGameStore } from '../../game/store';
import { STAGE_NAMES } from '../../game/store';
import { FORMATION_CONFIGS } from '../../game/constants';
import { FORMATION_COLORS, STRATEGIES } from './BattleSettings';
import {
  HERO_ARCHETYPE_META,
  HERO_DEFINITIONS,
  HERO_RARITY_META,
  calculateHeroSynergy,
  heroById,
  heroSkillSummary,
} from '../../game/heroes';

export function StageSelect() {
  const startBattle = useGameStore((s) => s.startBattle);
  const returnToTown = useGameStore((s) => s.returnToTown);
  const currentStrategy = useGameStore((s) => s.battleStrategy);
  const currentFormation = useGameStore((s) => s.formation);
  const townLevel = useGameStore((s) => s.townLevel);
  const townUnits = useGameStore((s) => s.townUnits);
  const ownedHeroIds = useGameStore((s) => s.ownedHeroIds);
  const selectedHeroId = useGameStore((s) => s.selectedHeroId);
  const setSelectedHero = useGameStore((s) => s.setSelectedHero);
  const goToBattleSettings = useGameStore((s) => s.goToBattleSettings);

  const stageGroups = [
    { chapter: 'チャプター1', stages: [0, 1, 2], unlock: 0 },
    { chapter: 'チャプター2', stages: [3, 4, 5], unlock: 1 },
  ];

  const stageDiff = ['⭐', '⭐⭐', '⭐⭐⭐', '⭐⭐', '⭐⭐⭐', '⭐⭐⭐⭐'];
  const stageDesc = [
    '少数の敵 - 初戦',
    '敵が増加',
    '初ボス登場',
    '強化された敵',
    '大軍勢',
    '最終決戦',
  ];

  const selectedOption = STRATEGIES.find((s) => s.value === currentStrategy) ?? STRATEGIES[0];
  const selectedFormationCfg = FORMATION_CONFIGS[currentFormation];
  const ownedHeroes = HERO_DEFINITIONS.filter((hero) => ownedHeroIds.includes(hero.id));
  const selectedHero = selectedHeroId && ownedHeroIds.includes(selectedHeroId)
    ? heroById(selectedHeroId) ?? ownedHeroes[0]
    : ownedHeroes[0];
  const selectedHeroSynergy = selectedHero ? calculateHeroSynergy(selectedHero, townUnits) : null;

  function handleStart(stageIdx: number) {
    startBattle(stageIdx);
  }

  return (
    <div style={{
      width: '100%', height: '100dvh', minHeight: 0,
      background: 'linear-gradient(160deg, #0d1117 0%, #1a1a2e 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'flex-start', fontFamily: 'sans-serif', color: '#fff',
      padding: 'clamp(12px, 4vh, 24px) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left))',
      overflowY: 'auto', boxSizing: 'border-box',
    }}>
      <div style={{ fontSize: 32, fontWeight: 900, marginBottom: 4, color: '#ffd700' }}>
        ⚔️ ステージ選択
      </div>
      <div style={{ color: '#888', fontSize: 13, marginBottom: 24 }}>
        街の防衛設備が自動的に配置されます。兵士は出撃後に訓練できます。
      </div>

      {/* ── Battle settings summary ───────────────────────────────────── */}
      <div style={{
        width: '100%', maxWidth: 700, boxSizing: 'border-box',
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 12, padding: '10px 12px', marginBottom: 18,
      }}>
        <div style={{ flex: 1, minWidth: 220, color: '#bbb', fontSize: 12 }}>
          <span style={{ color: selectedOption.color, fontWeight: 800 }}>{selectedOption.icon} {selectedOption.label}</span>
          <span style={{ color: '#666', margin: '0 7px' }}>｜</span>
          <span style={{ color: FORMATION_COLORS[currentFormation], fontWeight: 800 }}>{selectedFormationCfg.icon} {selectedFormationCfg.nameJP}</span>
        </div>
        <button
          onClick={() => goToBattleSettings('stage_select')}
          style={{
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 8, color: '#ddd', fontWeight: 700, fontSize: 12,
            padding: '7px 12px', cursor: 'pointer',
          }}
        >
          ⚙️ 設定を変更
        </button>
      </div>

      {/* ── Hero Selector ────────────────────────────────────────────────── */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,215,102,0.22)',
        borderRadius: 16,
        padding: '16px 20px',
        marginBottom: 24,
        width: '100%',
        maxWidth: 700,
        boxSizing: 'border-box',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#ffd166', letterSpacing: 1 }}>
            👑 出撃ヒーローを選択（1人）
          </div>
          <span style={{ color: '#888', fontSize: 11 }}>{ownedHeroes.length}人所持</span>
        </div>
        {ownedHeroes.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 8 }}>
            {ownedHeroes.map((hero) => {
            const isActive = selectedHero?.id === hero.id;
            const rarity = HERO_RARITY_META[hero.rarity];
            const archetype = HERO_ARCHETYPE_META[hero.archetype];
            const synergy = calculateHeroSynergy(hero, townUnits);
            return (
              <button
                key={hero.id}
                onClick={() => setSelectedHero(hero.id)}
                aria-pressed={isActive}
                style={{
                  textAlign: 'left',
                  background: isActive ? `${hero.color}22` : 'rgba(255,255,255,0.04)',
                  border: `1.5px solid ${isActive ? hero.color : 'rgba(255,255,255,0.12)'}`,
                  borderRadius: 10,
                  color: '#fff',
                  padding: '10px 12px',
                  cursor: 'pointer',
                  minHeight: 112,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 24 }}>{hero.emoji}</span>
                  <span style={{ fontWeight: 800, fontSize: 13, flex: 1 }}>{hero.nameJP}</span>
                  {isActive && <span style={{ color: hero.color, fontSize: 11 }}>選択中</span>}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 6, fontSize: 10 }}>
                  <span style={{ color: rarity.color, fontWeight: 700 }}>{rarity.label}</span>
                  <span style={{ color: '#bbb' }}>{archetype.icon} {archetype.label}</span>
                </div>
                <div style={{ color: '#aaa', fontSize: 10, lineHeight: 1.45, marginTop: 5 }}>
                  {hero.skill.nameJP} · {synergy.matchingCount}名 / 平均Tier {synergy.averageTier.toFixed(1)}
                </div>
              </button>
            );
            })}
          </div>
        ) : (
          <div style={{
            border: '1px dashed rgba(255,215,102,0.3)', borderRadius: 10,
            padding: '18px 14px', textAlign: 'center', color: '#aaa', fontSize: 12,
          }}>
            ヒーローはまだ所持していません。今後追加予定の入手システムで獲得できます。
          </div>
        )}
        {selectedHero && selectedHeroSynergy && (
          <div style={{
            marginTop: 12,
            background: `${selectedHero.color}12`,
            border: `1px solid ${selectedHero.color}44`,
            borderRadius: 8,
            padding: '10px 12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 22 }}>{selectedHero.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: selectedHero.color, fontWeight: 800, fontSize: 13 }}>
                  {selectedHero.nameJP} — {HERO_RARITY_META[selectedHero.rarity].label}
                </div>
                <div style={{ color: '#c8c8c8', fontSize: 11, marginTop: 2 }}>
                  適正兵種: {HERO_ARCHETYPE_META[selectedHero.archetype].icon} {HERO_ARCHETYPE_META[selectedHero.archetype].label}
                  {' ｜ '}シナジー: ×{selectedHeroSynergy.score.toFixed(2)}
                  {' ｜ '}{selectedHeroSynergy.matchingCount}名・平均Tier {selectedHeroSynergy.averageTier.toFixed(1)}
                </div>
              </div>
            </div>
            <div style={{ color: '#aaa', fontSize: 11, lineHeight: 1.5, marginTop: 6 }}>
              {selectedHero.skill.description} {heroSkillSummary(selectedHero, selectedHeroSynergy.score)}
            </div>
          </div>
        )}
      </div>

      {/* ── Stage Buttons ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', justifyContent: 'center' }}>
        {stageGroups.map((group) => {
          const locked = group.unlock > townLevel;
          return (
            <div key={group.chapter} style={{
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${locked ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)'}`,
              borderRadius: 16,
              padding: '20px 24px',
              opacity: locked ? 0.5 : 1,
              minWidth: 260,
            }}>
              <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 16, color: locked ? '#666' : '#fff' }}>
                {locked ? '🔒 ' : ''}{group.chapter}
                {locked && <div style={{ fontSize: 11, color: '#888', fontWeight: 400 }}>街レベル{group.unlock + 1}で解放</div>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {group.stages.map((stageIdx) => (
                  <button
                    key={stageIdx}
                    disabled={locked}
                    onClick={() => !locked && handleStart(stageIdx)}
                    style={{
                      background: locked ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: 10,
                      color: locked ? '#555' : '#fff',
                      padding: '12px 16px',
                      cursor: locked ? 'not-allowed' : 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.15s',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}
                    onMouseEnter={(e) => {
                      if (!locked) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      if (!locked) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)';
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>
                        ステージ {STAGE_NAMES[stageIdx]}
                      </div>
                      <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                        {stageDesc[stageIdx]}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <div style={{ fontSize: 14 }}>{stageDiff[stageIdx]}</div>
                      <div style={{
                        fontSize: 10, color: selectedOption.color,
                        background: `${selectedOption.color}18`,
                        borderRadius: 4, padding: '2px 6px',
                        fontWeight: 600,
                      }}>
                        {selectedOption.icon} {selectedOption.label}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={returnToTown}
        style={{
          marginTop: 32,
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 10,
          color: '#ccc', fontWeight: 700, fontSize: 14,
          padding: '10px 28px', cursor: 'pointer',
        }}
      >
        ← 街に戻る
      </button>
    </div>
  );
}
