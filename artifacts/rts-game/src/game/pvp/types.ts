import type { BattleStrategy, BuildingType, FormationType, UnitType } from '../types';

/** 自分のプロフィールに固定で使うID */
export const PLAYER_PROFILE_ID = 'player-local';

export const INITIAL_RATING = 1000;

export interface PvpUnitEntry {
  type: UnitType;
  level: number;
}

export interface PvpBuildingEntry {
  type: BuildingType;
  level: number;
  col: number;
  row: number;
}

/** 仮想DBに保存される「対戦用のプレイデータ」(自分もCPUも同じ形) */
export interface PvpProfile {
  id: string;
  name: string;
  isCpu: boolean;
  /** 0-indexed (表示は +1) */
  townLevel: number;
  rating: number;
  wins: number;
  losses: number;
  formation: FormationType;
  strategy: BattleStrategy;
  heroId: string | null;
  researchedNodeIds: string[];
  units: PvpUnitEntry[];
  buildings: PvpBuildingEntry[];
  /** 表示・CPU生成用の目安戦力 */
  power: number;
  /** CPUの強さラベル (人間は undefined) */
  difficulty?: 'easy' | 'normal' | 'hard' | 'elite';
  createdAt: number;
  updatedAt: number;
}

export type PvpOutcome = 'win' | 'lose';

export interface PvpBattleRecord {
  id: string;
  at: number;
  playerId: string;
  opponentId: string;
  opponentName: string;
  opponentIsCpu: boolean;
  outcome: PvpOutcome;
  ratingBefore: number;
  ratingAfter: number;
  goldReward: number;
  durationSec: number;
}

export interface PvpDbData {
  version: 1;
  profiles: PvpProfile[];
  log: PvpBattleRecord[];
}

/** 対戦中の状態(ストアの `pvp`)。対戦していないときは null */
export interface PvpBattleState {
  opponentId: string;
  opponentName: string;
  opponentIsCpu: boolean;
  opponentRating: number;
  opponentPower: number;
  ratingBefore: number;
  elapsed: number;
  limit: number;
}

export type PvpEndReason = 'base' | 'timeout' | 'forfeit';

/** 対戦結果画面に出す情報 */
export interface PvpResultInfo {
  outcome: PvpOutcome;
  reason: PvpEndReason;
  opponentName: string;
  ratingBefore: number;
  ratingAfter: number;
  goldReward: number;
  durationSec: number;
  /** 倒したCPUがDBから消えたか */
  opponentRemoved: boolean;
  /** 自動補充されたCPUの数 */
  cpuAdded: number;
}
