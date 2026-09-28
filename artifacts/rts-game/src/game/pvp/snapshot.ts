import type { BattleStrategy, FormationType, TownUnit } from '../types';
import type { Building } from '../types';
import { UNIT_CONFIGS, UNIT_LEVEL_MULT } from '../constants';
import type { PvpBuildingEntry, PvpProfile, PvpUnitEntry } from './types';
import { INITIAL_RATING, PLAYER_PROFILE_ID } from './types';

/** 1体あたりの戦力の目安(HP×攻撃力の幾何平均)。CPU生成と表示用。 */
export function unitPower(type: PvpUnitEntry['type'], level: number): number {
  const cfg = UNIT_CONFIGS[type];
  const mult = UNIT_LEVEL_MULT[Math.min(Math.max(level, 1) - 1, UNIT_LEVEL_MULT.length - 1)];
  return Math.sqrt(cfg.maxHp * mult.hp * cfg.damage * mult.damage);
}

export function armyPower(units: PvpUnitEntry[], buildings: PvpBuildingEntry[]): number {
  const unitsPower = units.reduce((sum, u) => sum + unitPower(u.type, u.level), 0);
  const towers = buildings.filter((b) => b.type === 'tower').reduce((sum, b) => sum + 30 + b.level * 10, 0);
  return Math.round(unitsPower + towers);
}

export interface TownSnapshotInput {
  townGridBuildings: Building[];
  townUnits: TownUnit[];
  townLevel: number;
  formation: FormationType;
  strategy: BattleStrategy;
  heroId: string | null;
  researchedNodeIds: string[];
}

/** いまの街の状態から、DBに保存する「自分のプレイデータ」を作る。rating等は既存レコードから引き継ぐ。 */
export function buildPlayerProfile(input: TownSnapshotInput, existing: PvpProfile | null): PvpProfile {
  const units: PvpUnitEntry[] = input.townUnits.map((u) => ({ type: u.type, level: u.level }));
  const buildings: PvpBuildingEntry[] = input.townGridBuildings.map((b) => ({
    type: b.type,
    level: b.level,
    col: b.gridX,
    row: b.gridZ,
  }));
  const now = Date.now();
  return {
    id: PLAYER_PROFILE_ID,
    name: existing?.name ?? 'あなた',
    isCpu: false,
    townLevel: input.townLevel,
    rating: existing?.rating ?? INITIAL_RATING,
    wins: existing?.wins ?? 0,
    losses: existing?.losses ?? 0,
    formation: input.formation,
    strategy: input.strategy,
    heroId: input.heroId,
    researchedNodeIds: [...input.researchedNodeIds],
    units,
    buildings,
    power: armyPower(units, buildings),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}
