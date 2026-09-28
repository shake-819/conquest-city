import { nanoid } from 'nanoid';
import {
  BUILDING_CONFIGS,
  UNIT_CONFIGS,
  UNITS_BY_TIER,
  maxUnitLevelForTown,
  resourceCapsForLevel,
  MAX_TOWN_LEVEL,
} from '../constants';
import type { BuildingType, FormationType, UnitType } from '../types';
import { armyPower, unitPower } from './snapshot';
import type { PvpBuildingEntry, PvpProfile, PvpResources, PvpUnitEntry } from './types';

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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * CPUの所持資源 = そのCPUレベルの「最大保持資源量」(=プレイヤーの貯蔵上限と同じ表)。
 * 本拠地を倒すと、この半分を獲得できる。
 */
export function cpuResourcesForLevel(townLevel: number): PvpResources {
  const caps = resourceCapsForLevel(townLevel);
  return { gold: caps.gold, food: caps.food, wood: caps.wood, stone: caps.stone };
}

// ── CPUの街の配置 ─────────────────────────────────────────────────────
// col / row は街グリッド座標。戦場では左右反転して右側に置かれる(col が大きいほど前線=プレイヤー側)。
//   col 0      本拠地(store側で別に置く)
//   col 1〜3   生産・訓練などの一般建物(一番奥)
//   col 4〜5   砲台
//   col 6      壁(最前列。攻めてきた兵士がここで足止めされ、砲台に撃たれる)
const WALL_COL = 6;
/** 壁を置く行(中央から外側へ) */
const WALL_ROW_ORDER = [4, 3, 5, 2, 6, 1, 7, 0, 8];
/** 砲台のスロット(壁のすぐ後ろ col5 を優先し、足りなければ col4) */
const TOWER_SLOTS: Array<[number, number]> = [
  [5, 4], [5, 2], [5, 6], [4, 3], [4, 5], [5, 0], [5, 8], [4, 1],
];
/** 一般建物の候補 */
const GENERAL_TYPES: BuildingType[] = [
  'barracks_melee', 'barracks_ranged', 'barracks_tank', 'barracks_caster',
  'house', 'farm', 'mine', 'lumbermill', 'quarry', 'hospital', 'research_lab',
];
const GENERAL_ROWS = [0, 2, 6, 8, 1, 7, 3, 5, 4];

export const MAX_CPU_TOWERS = TOWER_SLOTS.length;

/** CPUレベルに応じた「壁・砲台・一般建物」の配置を作る */
export function buildCpuBuildings(cpuTownLevel: number): PvpBuildingEntry[] {
  const level = Math.max(1, Math.round((cpuTownLevel + 1) * 0.6));
  const buildings: PvpBuildingEntry[] = [];

  // 壁: 序盤は中央だけ、レベルが上がるほど最前列が全行に広がる
  const wallCount = Math.min(WALL_ROW_ORDER.length, 3 + Math.floor(cpuTownLevel / 2));
  for (const row of WALL_ROW_ORDER.slice(0, wallCount)) {
    buildings.push({ type: 'wall', level, col: WALL_COL, row });
  }

  // 砲台: 最低1基。3レベルごとに1基増える
  const towerCount = Math.min(MAX_CPU_TOWERS, 1 + Math.floor(cpuTownLevel / 3));
  for (const [col, row] of TOWER_SLOTS.slice(0, towerCount)) {
    buildings.push({ type: 'tower', level, col, row });
  }

  // 一般建物: そのレベルで解放済みの種類から、色々な種類を置く
  const available = GENERAL_TYPES.filter((t) => (BUILDING_CONFIGS[t]?.unlockLevel ?? 0) <= cpuTownLevel);
  const generalCount = Math.min(GENERAL_ROWS.length * 3, 4 + Math.floor(cpuTownLevel / 3));
  const types = shuffle(available);
  let placed = 0;
  for (const col of [2, 1, 3]) {
    for (const row of GENERAL_ROWS) {
      if (placed >= generalCount || types.length === 0) break;
      buildings.push({ type: types[placed % types.length], level, col, row });
      placed++;
    }
  }
  return buildings;
}

/**
 * 古いバージョンで保存されたCPU(資源なし・壁なし)を、新しい仕様に引き上げる。
 * 変更がなければ同じオブジェクトをそのまま返す(呼び出し側は `!==` で変更有無を判定できる)。
 */
export function normalizeCpuProfile(p: PvpProfile): PvpProfile {
  if (!p.isCpu) return p;
  const needsResources = !p.resources;
  const needsDefense = !p.buildings.some((b) => b.type === 'wall');
  if (!needsResources && !needsDefense) return p;
  const buildings = needsDefense ? buildCpuBuildings(p.townLevel) : p.buildings;
  return {
    ...p,
    resources: p.resources ?? cpuResourcesForLevel(p.townLevel),
    buildings,
    power: armyPower(p.units, buildings),
    updatedAt: Date.now(),
  };
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

  const buildings = buildCpuBuildings(cpuTownLevel);

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
    resources: cpuResourcesForLevel(cpuTownLevel),
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
