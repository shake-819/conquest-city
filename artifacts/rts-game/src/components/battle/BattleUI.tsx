import { useState } from 'react';
import { useGameStore } from '../../game/store';
import { UNIT_CONFIGS, UNIT_LEVEL_MULT } from '../../game/constants';
import { STAGE_NAMES, MAX_STAGE_WAVES } from '../../game/store';
import { HERO_ARCHETYPE_META, HERO_RARITY_META, heroById } from '../../game/heroes';

const LEVEL_COLORS = ['#aaa', '#4caf50', '#ff9800', '#e91e63'];

export function BattleUI() {
  const resources = useGameStore((s) => s.resources);
  const wave = useGameStore((s) => s.wave);
  const waveTimer = useGameStore((s) => s.waveTimer);
  const stageIndex = useGameStore((s) => s.stageIndex);
  const message = useGameStore((s) => s.message);
  const messageTimer = useGameStore((s) => s.messageTimer);
  const returnToTown = useGameStore((s) => s.returnToTown);
  const maxWaves = MAX_STAGE_WAVES[stageIndex] ?? 3;
  const [resourcesHovered, setResourcesHovered] = useState(false);
  const battleHero = useGameStore((s) => s.battleHero);
  const useHeroSkill = useGameStore((s) => s.useHeroSkill);

  const playerUnits = useGameStore((s) => s.playerUnits);
  const enemyUnits = useGameStore((s) => s.enemyUnits);
  const townUnits = useGameStore((s) => s.townUnits);
  const heroDefinition = battleHero ? heroById(battleHero.definitionId) : undefined;
  const heroRarity = heroDefinition ? HERO_RARITY_META[heroDefinition.rarity] : undefined;
  const heroArchetype = heroDefinition ? HERO_ARCHETYPE_META[heroDefinition.archetype] : undefined;
  const heroHpRatio = battleHero ? Math.max(0, Math.min(1, battleHero.hp / Math.max(1, battleHero.maxHp))) : 0;

  // Summarize army composition from townUnits (what was brought to battle)
  const armySummary: Record<string, Record<number, number>> = {};
  for (const u of townUnits) {
    if (!armySummary[u.type]) armySummary[u.type] = {};
    armySummary[u.type][u.level] = (armySummary[u.type][u.level] ?? 0) + 1;
  }

  return (
    <>
      {/* Top HUD */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 12px',
        background: 'rgba(0,0,0,0.7)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        userSelect: 'none',
        flexWrap: 'wrap',
        gap: 8,
      }}
        onMouseEnter={() => setResourcesHovered(true)}
        onMouseLeave={() => setResourcesHovered(false)}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ color: '#87ceeb', fontWeight: 700 }}>
            ステージ {STAGE_NAMES[stageIndex]} ｜ ウェーブ {wave}/{maxWaves}
          </span>
          <span style={{
            color: waveTimer <= 10 ? '#ff6644' : '#fff',
            fontWeight: 700, fontSize: 13,
          }}>
            次の波 {Math.max(0, Math.ceil(waveTimer))}s
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 12 }}>
          <span style={{ color: '#4488ff' }}>味方: {playerUnits.length}</span>
          <span style={{ color: '#ff4444' }}>敵: {enemyUnits.length}</span>
        </div>
        <div
          aria-label="資源バー"
          style={{
            position: 'absolute', top: 'calc(100% + 5px)', left: 12,
            display: 'flex', gap: 16, alignItems: 'center',
            padding: '7px 12px',
            background: 'rgba(0,0,0,0.92)',
            border: '1px solid rgba(255,215,0,0.35)',
            borderRadius: 8,
            boxShadow: '0 6px 18px rgba(0,0,0,0.35)',
            opacity: resourcesHovered ? 1 : 0,
            visibility: resourcesHovered ? 'visible' : 'hidden',
            pointerEvents: resourcesHovered ? 'auto' : 'none',
            transition: 'opacity 0.12s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ color: '#ffd700', fontWeight: 700 }}>🪙 {Math.floor(resources.gold)}</span>
          <span style={{ color: '#8bc34a', fontWeight: 700 }}>🌾 {Math.floor(resources.food)}</span>
        </div>
      </div>

      {/* Message */}
      {message && messageTimer > 0 && (
        <div style={{
           position: 'absolute', top: 44, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.8)', color: '#ffdd44',
          fontWeight: 700, fontSize: 15, padding: '8px 24px',
          borderRadius: 8, border: '1px solid rgba(255,221,68,0.3)',
          pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>
          {message}
        </div>
      )}

      {/* Bottom panel */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'rgba(0,0,0,0.8)',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        padding: '8px 12px max(8px, env(safe-area-inset-bottom))',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        userSelect: 'none',
        gap: 12,
        flexWrap: 'wrap',
        maxHeight: '38vh',
        overflowY: 'auto',
      }}>
        {battleHero && heroDefinition && heroRarity && heroArchetype && (
          <div style={{
            width: 'min(100%, 420px)',
            minWidth: 250,
            background: `linear-gradient(120deg, ${heroDefinition.color}22, rgba(255,255,255,0.05))`,
            border: `1px solid ${heroDefinition.color}66`,
            borderRadius: 10,
            padding: '8px 10px',
            boxSizing: 'border-box',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 23 }}>{heroDefinition.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <strong style={{ color: heroDefinition.color, fontSize: 13 }}>{heroDefinition.nameJP}</strong>
                  <span style={{ color: heroRarity.color, fontSize: 10, fontWeight: 700 }}>{heroRarity.label}</span>
                </div>
                <div style={{ color: '#bbb', fontSize: 10, marginTop: 2 }}>
                  {heroArchetype.icon} {heroArchetype.label} ｜ シナジー ×{battleHero.synergyScore.toFixed(2)}
                  {' '}({battleHero.synergyCount}名 / Tier {battleHero.synergyAverageTier.toFixed(1)})
                </div>
              </div>
              <button
                onClick={useHeroSkill}
                disabled={battleHero.hp <= 0 || battleHero.skillTimer > 0}
                style={{
                  background: battleHero.skillTimer > 0 ? 'rgba(255,255,255,0.08)' : `${heroDefinition.color}dd`,
                  border: 'none',
                  borderRadius: 7,
                  color: battleHero.skillTimer > 0 ? '#777' : '#111',
                  fontWeight: 800,
                  fontSize: 11,
                  padding: '7px 9px',
                  cursor: battleHero.skillTimer > 0 || battleHero.hp <= 0 ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {battleHero.skillTimer > 0 ? `${Math.ceil(battleHero.skillTimer)}s` : 'スキル発動'}
              </button>
            </div>
            <div style={{ marginTop: 6, height: 8, background: 'rgba(0,0,0,0.55)', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{
                width: `${heroHpRatio * 100}%`,
                height: '100%',
                background: heroHpRatio > 0.6 ? '#39d353' : heroHpRatio > 0.3 ? '#ffb000' : '#ef4444',
                transition: 'width 0.15s linear',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 3, color: '#aaa', fontSize: 10 }}>
              <span>HP {Math.ceil(battleHero.hp)} / {battleHero.maxHp}</span>
              <span style={{ color: battleHero.skillActiveTimer > 0 ? '#ffd166' : '#888' }}>
                {heroDefinition.skill.nameJP}{battleHero.skillActiveTimer > 0 ? ` 強化中 ${Math.ceil(battleHero.skillActiveTimer)}s` : ''}
              </span>
            </div>
            <div style={{ color: '#999', fontSize: 10, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {heroDefinition.skill.description}
            </div>
          </div>
        )}

        {/* Army composition */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: '#aaa', fontSize: 11 }}>🗡️ 出撃兵士:</span>
          {townUnits.length === 0 ? (
            <span style={{ color: '#555', fontSize: 11 }}>なし（街で兵士を召喚しよう！）</span>
          ) : (
            Object.entries(armySummary).map(([type, levels]) =>
              Object.entries(levels).map(([lvl, count]) => {
                const cfg = UNIT_CONFIGS[type as keyof typeof UNIT_CONFIGS];
                const level = Number(lvl);
                const mult = UNIT_LEVEL_MULT[Math.min(level - 1, UNIT_LEVEL_MULT.length - 1)];
                return (
                  <div
                    key={`${type}-${lvl}`}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: 7,
                      padding: '4px 10px',
                      minWidth: 70,
                    }}
                  >
                    <span style={{ fontSize: 13 }}>{UNIT_CONFIGS[type as keyof typeof UNIT_CONFIGS]?.emoji} ×{count}</span>
                    <span style={{
                      fontSize: 10,
                      color: LEVEL_COLORS[level] ?? '#aaa',
                      fontWeight: 700,
                    }}>
                      {cfg.nameJP} Lv.{level}
                    </span>
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>
                      HP:{Math.round(cfg.maxHp * mult.hp)} ATK:{Math.round(cfg.damage * mult.damage)}
                    </span>
                  </div>
                );
              })
            )
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ color: '#666', fontSize: 11, textAlign: 'right' }}>
            WASD：カメラ移動<br />ホイール：ズーム
          </div>
          <button
            onClick={returnToTown}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 8, color: '#ccc',
              fontWeight: 700, fontSize: 13,
              padding: '8px 16px', cursor: 'pointer',
            }}
          >
            🏠 街へ戻る
          </button>
        </div>
      </div>
    </>
  );
}
