import { useEffect } from 'react';
import { useGameStore } from '../game/store';
import { TownView } from '../components/town/TownView';
import { StageSelect } from '../components/town/StageSelect';
import { BattleSettings } from '../components/town/BattleSettings';
import { BattleScene } from '../components/battle/BattleScene';
import { BattleUI } from '../components/battle/BattleUI';


function MenuScreen() {
  const startTown = useGameStore((s) => s.startTown);
  const loadGame = useGameStore((s) => s.loadGame);
  const goToBattleSettings = useGameStore((s) => s.goToBattleSettings);
  const hasSave = useGameStore((s) => s.hasSaveData)();

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(160deg, #0d1117 0%, #1a2a1a 50%, #1a1a2e 100%)',
      fontFamily: 'sans-serif',
    }}>
      <div style={{ fontSize: 56, fontWeight: 900, color: '#ffd700', marginBottom: 6, letterSpacing: 2 }}>
        🏰 CITY WARS
      </div>
      <div style={{ color: '#aaa', fontSize: 16, marginBottom: 40, textAlign: 'center', lineHeight: 1.7 }}>
        街を発展させながら敵国と戦う<br/>リアルタイムストラテジーゲーム
      </div>

      <div style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 14,
        padding: '20px 32px',
        marginBottom: 36,
        maxWidth: 420, width: '100%',
      }}>
        <div style={{ color: '#ffdd44', fontWeight: 700, marginBottom: 12, fontSize: 14 }}>ゲームの流れ</div>
        <div style={{ color: '#ccc', fontSize: 13, lineHeight: 2.1 }}>
          🏠 <b style={{ color: '#fff' }}>街モード</b>：建物を建設して街を発展させる<br/>
          ⚔️ <b style={{ color: '#fff' }}>ステージ選択</b>：戦う敵を選ぶ<br/>
          🗺️ <b style={{ color: '#fff' }}>バトルモード</b>：街の防衛施設で戦う<br/>
          🏆 勝利：敵本拠地を破壊せよ！
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={startTown}
          style={{
            background: 'linear-gradient(135deg, #ffd700, #ff8c00)',
            border: 'none', borderRadius: 12,
            color: '#000', fontWeight: 900,
            fontSize: 20, padding: '14px 48px',
            cursor: 'pointer', letterSpacing: 2,
            boxShadow: '0 4px 24px rgba(255,215,0,0.4)',
            fontFamily: 'sans-serif',
          }}
        >
          🆕 新規ゲーム
        </button>
        {hasSave && (
          <button
            onClick={loadGame}
            style={{
              background: 'linear-gradient(135deg, #3a9a3a, #226622)',
              border: 'none', borderRadius: 12,
              color: '#fff', fontWeight: 900,
              fontSize: 20, padding: '14px 36px',
              cursor: 'pointer', letterSpacing: 1,
              boxShadow: '0 4px 24px rgba(60,160,60,0.4)',
              fontFamily: 'sans-serif',
            }}
          >
            📂 続きから
          </button>
        )}
      </div>
      <button
        onClick={() => goToBattleSettings('menu')}
        style={{
          marginTop: 18,
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,215,102,0.35)',
          borderRadius: 10,
          color: '#ffd166',
          fontWeight: 700,
          fontSize: 14,
          padding: '10px 22px',
          cursor: 'pointer',
          fontFamily: 'sans-serif',
        }}
      >
        ⚙️ 戦術・陣形を設定
      </button>
    </div>
  );
}

function StageClearScreen() {
  const returnToTown = useGameStore((s) => s.returnToTown);
  const message = useGameStore((s) => s.message);
  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,10,0,0.88)', fontFamily: 'sans-serif',
    }}>
      <div style={{ fontSize: 60, marginBottom: 16 }}>🎉</div>
      <div style={{ fontSize: 36, fontWeight: 900, color: '#ffd700', marginBottom: 10 }}>ステージクリア！</div>
      <div style={{ color: '#8bc34a', fontSize: 16, marginBottom: 8 }}>{message}</div>
      <div style={{ color: '#aaa', fontSize: 13, marginBottom: 36 }}>
        街に戻って次のステージへの準備をしよう
      </div>
      <button
        onClick={returnToTown}
        style={{
          background: 'linear-gradient(135deg, #ffd700, #ff8c00)',
          border: 'none', borderRadius: 10,
          color: '#000', fontWeight: 900,
          fontSize: 18, padding: '12px 40px',
          cursor: 'pointer', fontFamily: 'sans-serif',
        }}
      >
        🏠 街に戻る
      </button>
    </div>
  );
}

function VictoryScreen() {
  const goToMenu = useGameStore((s) => s.goToMenu);
  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,15,0,0.9)', fontFamily: 'sans-serif',
    }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🏆</div>
      <div style={{ fontSize: 40, fontWeight: 900, color: '#ffd700', marginBottom: 8 }}>VICTORY！</div>
      <div style={{ color: '#8bc34a', fontSize: 18, marginBottom: 40 }}>
        全ステージクリア！あなたの街が最強です！
      </div>
      <button
        onClick={goToMenu}
        style={{
          background: 'linear-gradient(135deg, #ffd700, #ff8c00)',
          border: 'none', borderRadius: 10,
          color: '#000', fontWeight: 900,
          fontSize: 18, padding: '12px 40px',
          cursor: 'pointer', fontFamily: 'sans-serif',
        }}
      >
        タイトルへ
      </button>
    </div>
  );
}

function DefeatScreen() {
  const returnToTown = useGameStore((s) => s.returnToTown);
  const goToMenu = useGameStore((s) => s.goToMenu);
  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(15,0,0,0.9)', fontFamily: 'sans-serif',
    }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>💀</div>
      <div style={{ fontSize: 40, fontWeight: 900, color: '#ff4444', marginBottom: 8 }}>DEFEAT...</div>
      <div style={{ color: '#cc6666', fontSize: 16, marginBottom: 40 }}>
        本拠地が破壊されました。<br/>
        街に戻って防衛を強化しよう！
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={returnToTown}
          style={{
            background: 'linear-gradient(135deg, #4a90e2, #2266cc)',
            border: 'none', borderRadius: 10,
            color: '#fff', fontWeight: 900,
            fontSize: 16, padding: '12px 32px',
            cursor: 'pointer', fontFamily: 'sans-serif',
          }}
        >
          🏠 街に戻る
        </button>
        <button
          onClick={goToMenu}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 10,
            color: '#ccc', fontWeight: 700,
            fontSize: 16, padding: '12px 32px',
            cursor: 'pointer', fontFamily: 'sans-serif',
          }}
        >
          タイトルへ
        </button>
      </div>
    </div>
  );
}

function TownGameLoop() {
  const townTick = useGameStore((s) => s.townTick);
  useEffect(() => {
    const id = setInterval(() => townTick(0.1), 100);
    return () => clearInterval(id);
  }, [townTick]);
  return null;
}

export function GamePage() {
  const mode = useGameStore((s) => s.mode);

  return (
    <div style={{
      position: 'relative', width: '100%', height: '100dvh', minHeight: 0,
      overflow: 'hidden', fontFamily: 'sans-serif',
    }}>
      {mode === 'menu' && <MenuScreen />}

      {mode === 'town' && (
        <>
          <TownGameLoop />
          <TownView />
        </>
      )}

      {mode === 'stage_select' && <StageSelect />}
      {mode === 'battle_settings' && <BattleSettings />}

      {(mode === 'battle' || mode === 'defeat' || mode === 'stage_clear' || mode === 'victory') && (
        <>
          <BattleScene />
          {mode === 'battle' && <BattleUI />}
          {mode === 'stage_clear' && <StageClearScreen />}
          {mode === 'victory' && <VictoryScreen />}
          {mode === 'defeat' && <DefeatScreen />}
        </>
      )}
    </div>
  );
}
