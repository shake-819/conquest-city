import type { CSSProperties } from 'react';
import { useGameStore } from '../../game/store';
import { FORMATION_CONFIGS, UNIT_CONFIGS } from '../../game/constants';
import { CPU_POOL_MIN } from '../../game/pvp/cpu';
import type { PvpProfile } from '../../game/pvp/types';
import { FORMATION_COLORS, STRATEGIES } from '../town/BattleSettings';

const DIFFICULTY_META: Record<NonNullable<PvpProfile['difficulty']>, { label: string; color: string }> = {
  easy: { label: 'かんたん', color: '#4caf50' },
  normal: { label: 'ふつう', color: '#4aa3ff' },
  hard: { label: 'むずかしい', color: '#ff9800' },
  elite: { label: '精鋭', color: '#ef4444' },
};

const cardStyle: CSSProperties = {
  width: '100%',
  maxWidth: 720,
  boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.045)',
  border: '1px solid rgba(255,255,255,0.13)',
  borderRadius: 14,
  padding: '14px 16px',
};

/** 大きい数を短く表示する (1234 → 1.2K, 1500000 → 1.5M) */
function fmt(n: number): string {
  const v = Math.floor(n);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 10_000) return `${Math.round(v / 1000)}K`;
  if (v >= 1_000) return `${(v / 1000).toFixed(1)}K`;
  return String(v);
}

function unitSummary(profile: PvpProfile): string {
  const counts = new Map<string, number>();
  for (const u of profile.units) counts.set(u.type, (counts.get(u.type) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([type, n]) => `${UNIT_CONFIGS[type as keyof typeof UNIT_CONFIGS]?.emoji ?? '?'}×${n}`)
    .join('  ');
}

function OpponentCard({ cpu, myPower, disabled, onFight }: {
  cpu: PvpProfile;
  myPower: number;
  disabled: boolean;
  onFight: () => void;
}) {
  const diff = cpu.difficulty ? DIFFICULTY_META[cpu.difficulty] : undefined;
  const formation = FORMATION_CONFIGS[cpu.formation];
  const towers = cpu.buildings.filter((b) => b.type === 'tower').length;
  const walls = cpu.buildings.filter((b) => b.type === 'wall').length;
  const res = cpu.resources;
  const ratio = myPower > 0 ? cpu.power / myPower : 1;
  const ratioColor = ratio > 1.15 ? '#ef4444' : ratio < 0.8 ? '#4caf50' : '#ffd166';

  return (
    <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontWeight: 800, fontSize: 15 }}>🤖 {cpu.name}</span>
          {diff && (
            <span style={{ fontSize: 10, fontWeight: 800, color: diff.color, border: `1px solid ${diff.color}88`, borderRadius: 6, padding: '1px 6px' }}>
              {diff.label}
            </span>
          )}
        </div>
        <div style={{ color: '#aaa', fontSize: 11, lineHeight: 1.7 }}>
          レート {cpu.rating} ｜ 本拠地 Lv.{cpu.townLevel + 1} ｜ 兵士 {cpu.units.length}名
          {towers > 0 ? ` ｜ 🗼砲台×${towers}` : ''}
          {walls > 0 ? ` ｜ 🧱壁×${walls}` : ''}
          <br />
          <span style={{ color: FORMATION_COLORS[cpu.formation] }}>{formation.icon} {formation.nameJP}</span>
          <span style={{ color: '#666' }}> ｜ </span>
          {unitSummary(cpu)}
          {res && (
            <>
              <br />
              <span style={{ color: '#ffd166' }}>
                💰 奪える資源(半分): 🪙{fmt(res.gold / 2)} 🌾{fmt(res.food / 2)} 🪵{fmt(res.wood / 2)} 🪨{fmt(res.stone / 2)}
              </span>
            </>
          )}
        </div>
      </div>
      <div style={{ textAlign: 'center', minWidth: 70 }}>
        <div style={{ color: '#777', fontSize: 10 }}>戦力比</div>
        <div style={{ color: ratioColor, fontWeight: 900, fontSize: 16 }}>×{ratio.toFixed(2)}</div>
      </div>
      <button
        onClick={onFight}
        disabled={disabled}
        style={{
          background: disabled ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #e25822, #a93216)',
          border: 'none', borderRadius: 9,
          color: disabled ? '#777' : '#fff',
          fontWeight: 800, fontSize: 14, padding: '10px 22px',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        ⚔️ 挑戦
      </button>
    </div>
  );
}

export function PvpLobby() {
  const me = useGameStore((s) => s.pvpMe);
  const roster = useGameStore((s) => s.pvpRoster);
  const log = useGameStore((s) => s.pvpLog);
  const busy = useGameStore((s) => s.pvpBusy);
  const townUnits = useGameStore((s) => s.townUnits);
  const formation = useGameStore((s) => s.formation);
  const strategy = useGameStore((s) => s.battleStrategy);
  const startPvpBattle = useGameStore((s) => s.startPvpBattle);
  const returnToTown = useGameStore((s) => s.returnToTown);
  const goToBattleSettings = useGameStore((s) => s.goToBattleSettings);

  const formationCfg = FORMATION_CONFIGS[formation];
  const strategyOpt = STRATEGIES.find((o) => o.value === strategy) ?? STRATEGIES[0];
  const noUnits = townUnits.length === 0;
  const sorted = [...roster].sort((a, b) => a.rating - b.rating);
  const myPower = me?.power ?? 0;

  return (
    <div style={{
      width: '100%', height: '100dvh', minHeight: 0,
      background: 'linear-gradient(160deg, #0d1117 0%, #1a1a2e 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      fontFamily: 'sans-serif', color: '#fff',
      padding: 'clamp(12px, 4vh, 24px) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left))',
      overflowY: 'auto', boxSizing: 'border-box', gap: 12,
    }}>
      <div style={{ fontSize: 30, fontWeight: 900, color: '#ffd700' }}>🥊 ローカル対戦</div>
      <div style={{ color: '#888', fontSize: 12, textAlign: 'center', lineHeight: 1.7 }}>
        保存された自分のデータとCPUのデータを読み込んで戦います。<br />
        街の建物・兵士は減りません。CPUの本拠地を倒すと、相手の所持資源の半分を獲得できます（上限を超えた分は切り捨て）。
      </div>

      {/* 自分のデータ */}
      <div style={{ ...cardStyle, border: '1px solid rgba(255,215,102,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#ffd166' }}>👤 {me?.name ?? 'あなた'}</div>
            <div style={{ color: '#aaa', fontSize: 11, marginTop: 4, lineHeight: 1.7 }}>
              <span style={{ color: strategyOpt.color }}>{strategyOpt.icon} {strategyOpt.label}</span>
              <span style={{ color: '#666' }}> ｜ </span>
              <span style={{ color: FORMATION_COLORS[formation] }}>{formationCfg.icon} {formationCfg.nameJP}</span>
              <span style={{ color: '#666' }}> ｜ </span>
              出撃 {townUnits.length}名
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#777', fontSize: 10 }}>レート</div>
              <div style={{ fontWeight: 900, fontSize: 20, color: '#ffd700' }}>{me?.rating ?? '-'}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#777', fontSize: 10 }}>戦績</div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>{me?.wins ?? 0}勝 {me?.losses ?? 0}敗</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#777', fontSize: 10 }}>戦力</div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>{myPower}</div>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <button
            onClick={() => goToBattleSettings('pvp_lobby')}
            style={{
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 8, color: '#ddd', fontWeight: 700, fontSize: 12,
              padding: '7px 12px', cursor: 'pointer',
            }}
          >
            ⚙️ 戦術・陣形を変更
          </button>
        </div>
        {noUnits && (
          <div style={{ marginTop: 10, color: '#ff8a80', fontSize: 12, fontWeight: 700 }}>
            出撃できる兵士がいません。街の訓練所で兵士を招集してから挑戦しましょう。
          </div>
        )}
      </div>

      {/* CPU一覧 */}
      <div style={{ width: '100%', maxWidth: 720, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontWeight: 800, color: '#87ceeb', fontSize: 14 }}>対戦相手 (CPU {roster.length}人)</span>
        <span style={{ color: '#666', fontSize: 10 }}>倒すと消え、{CPU_POOL_MIN}人を下回ると自動で補充されます</span>
      </div>

      {busy && roster.length === 0 && <div style={{ color: '#888', fontSize: 13 }}>データを読み込み中…</div>}
      {sorted.map((cpu) => (
        <OpponentCard
          key={cpu.id}
          cpu={cpu}
          myPower={myPower}
          disabled={busy || noUnits}
          onFight={() => void startPvpBattle(cpu.id)}
        />
      ))}

      {/* 対戦ログ */}
      {log.length > 0 && (
        <div style={{ ...cardStyle }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: '#bbb', marginBottom: 8 }}>📜 最近の対戦</div>
          {log.slice(0, 5).map((r) => {
            const delta = r.ratingAfter - r.ratingBefore;
            return (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#aaa', padding: '3px 0' }}>
                <span>
                  <b style={{ color: r.outcome === 'win' ? '#8bc34a' : '#ef5350' }}>{r.outcome === 'win' ? '勝ち' : '負け'}</b>
                  {' '}vs {r.opponentName}
                </span>
                <span style={{ color: delta >= 0 ? '#8bc34a' : '#ef5350' }}>
                  {delta >= 0 ? '+' : ''}{delta} ｜ 🪙+{r.goldReward}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ color: '#555', fontSize: 10 }}>データの保存先: この端末の仮想DB (localStorage)</div>
      <button
        onClick={returnToTown}
        style={{
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 10, color: '#ccc', fontWeight: 700, fontSize: 14,
          padding: '10px 28px', cursor: 'pointer', marginBottom: 12,
        }}
      >
        🏠 街に戻る
      </button>
    </div>
  );
}
