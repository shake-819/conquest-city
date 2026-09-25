import type { CSSProperties } from 'react';
import { useGameStore } from '../../game/store';
import type { BattleStrategy, FormationType } from '../../game/types';
import { FORMATION_CONFIGS } from '../../game/constants';

export type StrategyOption = {
  value: BattleStrategy;
  label: string;
  icon: string;
  desc: string;
  color: string;
};

export const STRATEGIES: StrategyOption[] = [
  { value: 'base_rush', label: '本拠地破壊特化', icon: '🏰', desc: '敵ユニットを無視して本拠地に直攻', color: '#ef4444' },
  { value: 'massacre', label: '虐殺', icon: '⚔️', desc: '敵ユニットを全滅させてから本拠地を落とす', color: '#f97316' },
  { value: 'defend', label: '守備特化', icon: '🛡️', desc: '自陣に留まり、敵が近づいたら迎撃', color: '#3b82f6' },
  { value: 'frontline', label: '前線キープ', icon: '⚡', desc: '中央まで前進して戦線を維持', color: '#a855f7' },
  { value: 'wave_attack', label: '波状攻撃', icon: '🌊', desc: '8秒前進→5秒停止を繰り返す波状戦術', color: '#06b6d4' },
];

export const FORMATION_ORDER: FormationType[] = ['suikou', 'gyorin', 'kakuyoku', 'houen', 'gankou', 'chouda'];
export const FORMATION_COLORS: Record<FormationType, string> = {
  suikou: '#ef4444',
  gyorin: '#06b6d4',
  kakuyoku: '#f97316',
  houen: '#3b82f6',
  gankou: '#a855f7',
  chouda: '#22c55e',
};

const panelStyle: CSSProperties = {
  width: '100%',
  maxWidth: 760,
  background: 'rgba(255,255,255,0.045)',
  border: '1px solid rgba(255,255,255,0.13)',
  borderRadius: 16,
  padding: '16px 20px',
  boxSizing: 'border-box',
};

export function BattleSettings() {
  const currentStrategy = useGameStore((s) => s.battleStrategy);
  const currentFormation = useGameStore((s) => s.formation);
  const goToStageSelect = useGameStore((s) => s.goToStageSelect);
  const leaveBattleSettings = useGameStore((s) => s.leaveBattleSettings);
  const origin = useGameStore((s) => s.battleSettingsOrigin);
  const selectedStrategy = STRATEGIES.find((option) => option.value === currentStrategy) ?? STRATEGIES[0];
  const selectedFormation = FORMATION_CONFIGS[currentFormation];

  const backLabel = origin === 'menu' ? '← ホームへ戻る' : origin === 'stage_select' ? '← 出撃選択へ戻る' : '← 街へ戻る';

  return (
    <div style={{
      width: '100%', height: '100dvh', minHeight: 0,
      background: 'linear-gradient(160deg, #0d1117 0%, #1a1a2e 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      color: '#fff', fontFamily: 'sans-serif',
      padding: 'clamp(14px, 4vh, 28px) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left))',
      overflowY: 'auto', boxSizing: 'border-box',
    }}>
      <div style={{ fontSize: 'clamp(24px, 4vw, 34px)', fontWeight: 900, color: '#ffd166', marginBottom: 5 }}>
        ⚙️ 戦術・陣形設定
      </div>
      <div style={{ color: '#999', fontSize: 13, marginBottom: 22, textAlign: 'center' }}>
        出撃前に軍の動き方と兵士の配置を決めます。変更はすぐに反映されます。
      </div>

      <section style={{ ...panelStyle, marginBottom: 16 }}>
        <div style={{ color: '#aaa', fontSize: 13, fontWeight: 800, letterSpacing: 1, marginBottom: 12 }}>🎯 戦術を選択</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 8 }}>
          {STRATEGIES.map((option) => {
            const active = currentStrategy === option.value;
            return (
              <button
                key={option.value}
                onClick={() => useGameStore.getState().setBattleStrategy(option.value)}
                style={{
                  textAlign: 'left', minHeight: 82, padding: '10px 12px',
                  background: active ? `${option.color}22` : 'rgba(255,255,255,0.04)',
                  border: `1.5px solid ${active ? option.color : 'rgba(255,255,255,0.12)'}`,
                  borderRadius: 10, color: '#fff', cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                  <span style={{ fontSize: 19 }}>{option.icon}</span>
                  <strong style={{ color: active ? option.color : '#ddd', fontSize: 13 }}>{option.label}</strong>
                  {active && <span style={{ color: option.color, fontSize: 10, marginLeft: 'auto' }}>選択中</span>}
                </div>
                <div style={{ color: '#aaa', fontSize: 11, lineHeight: 1.4, marginTop: 6 }}>{option.desc}</div>
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 12, padding: '9px 12px', borderRadius: 8, background: `${selectedStrategy.color}12`, border: `1px solid ${selectedStrategy.color}44` }}>
          <span style={{ color: selectedStrategy.color, fontWeight: 800, fontSize: 13 }}>{selectedStrategy.icon} {selectedStrategy.label}</span>
          <span style={{ color: '#bbb', fontSize: 11, marginLeft: 9 }}>{selectedStrategy.desc}</span>
        </div>
      </section>

      <section style={panelStyle}>
        <div style={{ color: '#aaa', fontSize: 13, fontWeight: 800, letterSpacing: 1, marginBottom: 12 }}>🈲 陣形を選択</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
          {FORMATION_ORDER.map((formation) => {
            const config = FORMATION_CONFIGS[formation];
            const color = FORMATION_COLORS[formation];
            const active = currentFormation === formation;
            return (
              <button
                key={formation}
                onClick={() => useGameStore.getState().setFormation(formation)}
                style={{
                  textAlign: 'left', minHeight: 82, padding: '10px 12px',
                  background: active ? `${color}22` : 'rgba(255,255,255,0.04)',
                  border: `1.5px solid ${active ? color : 'rgba(255,255,255,0.12)'}`,
                  borderRadius: 10, color: '#fff', cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                  <span style={{ fontSize: 19 }}>{config.icon}</span>
                  <strong style={{ color: active ? color : '#ddd', fontSize: 13 }}>{config.nameJP}</strong>
                  {active && <span style={{ color, fontSize: 10, marginLeft: 'auto' }}>選択中</span>}
                </div>
                <div style={{ color: '#aaa', fontSize: 11, lineHeight: 1.4, marginTop: 6 }}>{config.desc}</div>
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 12, padding: '9px 12px', borderRadius: 8, background: `${FORMATION_COLORS[currentFormation]}12`, border: `1px solid ${FORMATION_COLORS[currentFormation]}44`, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ color: FORMATION_COLORS[currentFormation], fontWeight: 800, fontSize: 13 }}>{selectedFormation.icon} {selectedFormation.nameJP}</span>
          <span style={{ color: '#bbb', fontSize: 11, flex: 1 }}>{selectedFormation.desc}</span>
          <span style={{ color: '#ccc', fontSize: 10 }}>⚔️×{selectedFormation.atkMult.toFixed(2)} 🛡️×{selectedFormation.defMult.toFixed(2)} 🏃×{selectedFormation.speedMult.toFixed(2)}</span>
        </div>
      </section>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 22 }}>
        {origin !== 'menu' && (
          <button onClick={goToStageSelect} style={{ background: 'linear-gradient(135deg, #e25822, #a93216)', border: 'none', borderRadius: 9, color: '#fff', fontWeight: 800, padding: '10px 20px', cursor: 'pointer' }}>
            ⚔️ この設定で出撃先を選ぶ
          </button>
        )}
        <button onClick={leaveBattleSettings} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 9, color: '#ccc', fontWeight: 700, padding: '10px 20px', cursor: 'pointer' }}>
          {backLabel}
        </button>
      </div>
    </div>
  );
}