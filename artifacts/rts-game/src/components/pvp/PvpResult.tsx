import { useGameStore } from '../../game/store';

const REASON_TEXT = {
  base: '本拠地が決め手になった',
  timeout: '時間切れ判定(本拠地HP・残り兵力)',
  forfeit: '降参',
} as const;

export function PvpResult() {
  const result = useGameStore((s) => s.pvpResult);
  const backToPvpLobby = useGameStore((s) => s.backToPvpLobby);
  const returnToTown = useGameStore((s) => s.returnToTown);
  if (!result) return null;

  const won = result.outcome === 'win';
  const delta = result.ratingAfter - result.ratingBefore;

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: won ? 'rgba(0,15,0,0.9)' : 'rgba(15,0,0,0.9)', fontFamily: 'sans-serif',
      padding: 16, boxSizing: 'border-box', textAlign: 'center',
    }}>
      <div style={{ fontSize: 60, marginBottom: 10 }}>{won ? '🏆' : '💀'}</div>
      <div style={{ fontSize: 38, fontWeight: 900, color: won ? '#ffd700' : '#ff4444', marginBottom: 6 }}>
        {won ? 'WIN！' : 'LOSE...'}
      </div>
      <div style={{ color: '#ccc', fontSize: 15, marginBottom: 4 }}>vs {result.opponentName}</div>
      <div style={{ color: '#888', fontSize: 12, marginBottom: 20 }}>
        {REASON_TEXT[result.reason]} ｜ {result.durationSec}秒
      </div>

      <div style={{
        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 12, padding: '14px 28px', marginBottom: 14, lineHeight: 2, color: '#eee', fontSize: 15,
      }}>
        レート {result.ratingBefore} → <b style={{ color: '#ffd700' }}>{result.ratingAfter}</b>
        {' '}
        <span style={{ color: delta >= 0 ? '#8bc34a' : '#ef5350', fontWeight: 800 }}>
          ({delta >= 0 ? '+' : ''}{delta})
        </span>
        <br />
        🪙 ゴールド +{result.goldReward}
      </div>

      {(result.opponentRemoved || result.cpuAdded > 0) && (
        <div style={{ color: '#87ceeb', fontSize: 12, marginBottom: 20, lineHeight: 1.8 }}>
          {result.opponentRemoved && <>倒したCPUはデータから削除されました。<br /></>}
          {result.cpuAdded > 0 && <>CPUが減ったため、新しいCPUのデータを{result.cpuAdded}人分追加しました。</>}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={backToPvpLobby}
          style={{
            background: 'linear-gradient(135deg, #e25822, #a93216)', border: 'none', borderRadius: 10,
            color: '#fff', fontWeight: 900, fontSize: 16, padding: '12px 32px', cursor: 'pointer',
          }}
        >
          🥊 対戦ロビーへ
        </button>
        <button
          onClick={returnToTown}
          style={{
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10,
            color: '#ccc', fontWeight: 700, fontSize: 16, padding: '12px 32px', cursor: 'pointer',
          }}
        >
          🏠 街に戻る
        </button>
      </div>
    </div>
  );
}
