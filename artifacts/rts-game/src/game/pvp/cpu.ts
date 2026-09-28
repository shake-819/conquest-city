import { nanoid } from 'nanoid';
import { UNIT_CONFIGS, UNITS_BY_TIER, maxUnitLevelForTown, MAX_TOWN_LEVEL } from '../constants';
import type { FormationType, UnitType } from '../types';
import { armyPower, unitPower } from './snapshot';
import type { PvpBuildingEntry, PvpProfile, PvpUnitEntry } from './types';
import { INITIAL_RATING } from './types';

/** CPUがこの人数を下回ったら自動で補充する */
export const CPU_POOL_MIN = 5;
/** 補充するときの目標人数 */
export const CPU_POOL_TARGET = 8;

const CPU_NAMES = [
  '鉄壁のガルド', '疾風のミナト', '紅蓮のレイ', '白銀のセラ', '闇夜のカゲロウ',
  '蒼海のルカ', '黄金のハンニバル', '霧隠のシズク', '雷鳴のトウマ', '大地のバルガス',
  '月影のアヤメ', '烈火のジン', '氷雪のユキノ', '天空のリュウ', '砂塵のサイード',
  '鋼鉄のロナン', '桜花のコハル', '嵐のヴァルター', '暁のアカツキ', '幻影のミラ',
];

const FORMATIONS: FormationType[] = ['suikou', 'gyorin', 'kakuyoku', 'houen', 'gankou', 'chouda'];

const DIFFICULTIES = [
  { key: 'easy' as const, factor: 0.65, ratingOffset: -120 },
  { key: 'normal' as const, factor: 0.9, ratingOffset: -30 },
  { key: 'hard' as const, factor: 1.1, ratingOffset: 60 },
  { key: 'elite' as const, factor: 1.35, ratingOffset: 150 },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** 自分の戦力を基準に、CPUのプレイデータを1件作る */
export function generateCpuProfile(
  player: Pick<PvpProfile, 'power' | 'townLevel' | 'units' | 'rating'>,
  usedNames: Set<string>,
  difficultyIndex?: number,
): PvpProfile {
  const diff = DIFFICULTIES[difficultyIndex ?? Math.floor(Math.random() * DIFFICULTIES.length)];

  // 自分の最高ティアを基準に、その -2 〜 同ティアの兵種を使う
  const playerMaxTier = player.units.reduce((m, u) => Math.max(m, UNIT_CONFIGS[u.type].barracksTier), 1);
  const maxTier = Math.max(1, playerMaxTier);
  const minTier = Math.max(1, maxTier - 2);
  const candidates: UnitType[] = [];
  for (let t = minTier; t <= maxTier; t++) candidates.push(...(UNITS_BY_TIER[t] ?? []));

  const cpuTownLevel = Math.min(
    MAX_TOWN_LEVEL,
    Math.max(0, player.townLevel + (diff.key === 'easy' ? -1 : diff.key === 'elite' ? 1 : 0)),
  );
  const maxLevel = maxUnitLevelForTown(cpuTownLevel);

  // 兵士がいない/少ない場合でも最低限の戦力を確保する
  const baseline = unitPower('soldier', 1) * 6;
  const target = Math.max(player.power, baseline) * diff.factor;
  const cap = Math.min(80, Math.max(8, player.units.length + 6));

  const units: PvpUnitEntry[] = [];
  let power = 0;
  while (power < target && units.length < cap) {
    const type = pick(candidates);
    const level = 1 + Math.floor(Math.random() * maxLevel);
    units.push({ type, level });
    power += unitPower(type, level);
  }

  const towerCount = Math.min(5, Math.round(cpuTownLevel / 6));
  const towerLevel = Math.max(1, Math.round(cpuTownLevel * 0.6) + 1);
  const buildings: PvpBuildingEntry[] = [];
  for (let i = 0; i < towerCount; i++) {
    buildings.push({ type: 'tower', level: towerLevel, col: 3, row: 1 + i * 2 });
  }

  const freeNames = CPU_NAMES.filter((n) => !usedNames.has(n));
  const name = freeNames.length > 0 ? pick(freeNames) : `${pick(CPU_NAMES)}#${Math.floor(Math.random() * 90 + 10)}`;
  usedNames.add(name);

  const now = Date.now();
  return {
    id: `cpu-${nanoid(8)}`,
    name,
    isCpu: true,
    townLevel: cpuTownLevel,
    rating: Math.max(100, player.rating + diff.ratingOffset),
    wins: 0,
    losses: 0,
    formation: pick(FORMATIONS),
    // 敵側は陣形だけが効く(戦術・ヒーローは自分専用のため、CPUは固定値)
    strategy: 'massacre',
    heroId: null,
    researchedNodeIds: [],
    units,
    buildings,
    power: armyPower(units, buildings),
    difficulty: diff.key,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * CPUが CPU_POOL_MIN 人を下回っていたら、CPU_POOL_TARGET 人になるまで補充する。
 * 追加したCPUの配列を返す(補充不要なら空配列)。
 */
export function topUpCpuProfiles(
  existingCpus: PvpProfile[],
  player: Pick<PvpProfile, 'power' | 'townLevel' | 'units' | 'rating'>,
): PvpProfile[] {
  if (existingCpus.length >= CPU_POOL_MIN) return [];
  const used = new Set(existingCpus.map((c) => c.name));
  const added: PvpProfile[] = [];
  const need = CPU_POOL_TARGET - existingCpus.length;
  for (let i = 0; i < need; i++) {
    // 弱い/普通/強い/精鋭がまんべんなく並ぶように順番に割り当てる
    added.push(generateCpuProfile(player, used, (existingCpus.length + i) % DIFFICULTIES.length));
  }
  return added;
}
