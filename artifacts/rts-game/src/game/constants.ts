import type { BuildingType, UnitType, FormationType } from './types';

export const GRID_SIZE = 30;
export const CELL_SIZE = 2;

export const MAX_TOWN_LEVEL = 29; // 0-indexed, so Lv.1〜Lv.30

export interface BuildingConfig {
  name: string;
  nameJP: string;
  maxHp: number;
  cost: { gold: number; wood: number; stone: number; food: number };
  unlockLevel: number;
  size: number;
  color: string;
  description: string;
}

export const BUILDING_CONFIGS: Record<BuildingType, BuildingConfig> = {
  townhall: {
    name: 'Town Hall',
    nameJP: '本拠地',
    maxHp: 500,
    cost: { gold: 0, wood: 0, stone: 0, food: 0 },
    unlockLevel: 0,
    size: 1,
    color: '#4a90e2',
    description: 'Your main base. Protect it at all costs!',
  },
  house: {
    name: 'House',
    nameJP: '住宅',
    maxHp: 80,
    cost: { gold: 30, wood: 20, stone: 0, food: 0 },
    unlockLevel: 0,
    size: 1,
    color: '#f5a623',
    description: 'Generates gold over time.',
  },
  farm: {
    name: 'Farm',
    nameJP: '農場',
    maxHp: 60,
    cost: { gold: 25, wood: 15, stone: 0, food: 0 },
    unlockLevel: 0,
    size: 1,
    color: '#7ec850',
    description: 'Produces food for your units.',
  },
  wall: {
    name: 'Wall',
    nameJP: '壁',
    maxHp: 200,
    cost: { gold: 20, wood: 10, stone: 5, food: 0 },
    unlockLevel: 0,
    size: 1,
    color: '#8b7355',
    description: 'Blocks enemy movement.',
  },
  barracks: {
    name: 'Barracks',
    nameJP: '兵舎',
    maxHp: 120,
    cost: { gold: 60, wood: 40, stone: 10, food: 0 },
    unlockLevel: 3,
    size: 1,
    color: '#d0021b',
    description: 'Recruit and merge to create powerful soldiers.',
  },
  barracks_melee: {
    name: 'Melee Dojo',
    nameJP: '剣士訓練所',
    maxHp: 120,
    cost: { gold: 60, wood: 40, stone: 10, food: 0 },
    unlockLevel: 0,
    size: 1,
    color: '#e53935',
    description: 'Trains melee and strike units.',
  },
  barracks_ranged: {
    name: 'Archer Range',
    nameJP: '弓兵訓練所',
    maxHp: 100,
    cost: { gold: 60, wood: 40, stone: 10, food: 0 },
    unlockLevel: 0,
    size: 1,
    color: '#4caf50',
    description: 'Trains ranged units.',
  },
  barracks_tank: {
    name: 'Shield Barracks',
    nameJP: '盾兵訓練所',
    maxHp: 140,
    cost: { gold: 60, wood: 40, stone: 10, food: 0 },
    unlockLevel: 0,
    size: 1,
    color: '#607d8b',
    description: 'Trains tank units.',
  },
  barracks_caster: {
    name: 'Magic Tower',
    nameJP: '魔法訓練所',
    maxHp: 100,
    cost: { gold: 60, wood: 40, stone: 10, food: 0 },
    unlockLevel: 0,
    size: 1,
    color: '#9c27b0',
    description: 'Trains caster units.',
  },
  hospital: {
    name: 'Hospital',
    nameJP: '病院',
    maxHp: 150,
    cost: { gold: 80, wood: 50, stone: 20, food: 0 },
    unlockLevel: 0,
    size: 1,
    color: '#e91e63',
    description: '戦闘で倒れた兵士を収容・治療する。',
  },
  research_lab: {
    name: 'Research Laboratory',
    nameJP: '研究所',
    maxHp: 220,
    cost: { gold: 240, wood: 180, stone: 140, food: 100 },
    unlockLevel: 3,
    size: 1,
    color: '#c49a4a',
    description: '研究を進め、街・兵士・資源・ヒーローを強化する。',
  },
  mine: {
    name: 'Mine',
    nameJP: '金鉱',
    maxHp: 100,
    cost: { gold: 50, wood: 30, stone: 15, food: 0 },
    unlockLevel: 5,
    size: 1,
    color: '#ffd700',
    description: 'Produces gold quickly.',
  },
  tower: {
    name: 'Tower',
    nameJP: '砲台',
    maxHp: 150,
    cost: { gold: 80, wood: 30, stone: 20, food: 0 },
    unlockLevel: 8,
    size: 1,
    color: '#7b68ee',
    description: 'Attacks nearby enemies automatically.',
  },
  lumbermill: {
    name: 'Lumber Mill',
    nameJP: '木材生産所',
    maxHp: 90,
    cost: { gold: 35, wood: 10, stone: 0, food: 0 },
    unlockLevel: 0,
    size: 1,
    color: '#8b5a2b',
    description: 'Produces wood over time.',
  },
  quarry: {
    name: 'Quarry',
    nameJP: '石材採掘場',
    maxHp: 100,
    cost: { gold: 45, wood: 15, stone: 0, food: 0 },
    unlockLevel: 0,
    size: 1,
    color: '#9e9e9e',
    description: 'Produces stone over time.',
  },
};

export type UnitArchetype = 'melee' | 'ranged' | 'tank' | 'caster' | 'strike';

export interface UnitConfig {
  name: string;
  nameJP: string;
  emoji: string;
  maxHp: number;
  cost: { gold: number; food: number };
  /** Unit tier 1-10. Trainable once the barracks reaches Lv.(tier*3). */
  barracksTier: number;
  archetype: UnitArchetype;
  speed: number;
  damage: number;
  attackRange: number;
  color: string;
}

/** Number of unit tiers in the game (Tier 1 - Tier 10) */
export const MAX_UNIT_TIER = 10;

interface UnitMeta {
  type: UnitType;
  name: string;
  nameJP: string;
  emoji: string;
  tier: number;
  archetype: UnitArchetype;
  color: string;
}

const UNIT_META: UnitMeta[] = [
  // ── Tier 1: Barracks Lv.3 ────────────────────────────────────────────
  { type: 'soldier', name: 'Soldier', nameJP: '兵士', emoji: '⚔️', tier: 1, archetype: 'melee', color: '#2196F3' },
  { type: 'archer', name: 'Archer', nameJP: '弓兵', emoji: '🏹', tier: 1, archetype: 'ranged', color: '#4CAF50' },
  { type: 'spearman', name: 'Spearman', nameJP: '槍兵', emoji: '🗡️', tier: 1, archetype: 'melee', color: '#795548' },
  { type: 'guard', name: 'Guard', nameJP: '盾兵', emoji: '🛡️', tier: 1, archetype: 'tank', color: '#607D8B' },
  { type: 'apprentice_mage', name: 'Apprentice Mage', nameJP: '見習い魔術師', emoji: '📖', tier: 1, archetype: 'caster', color: '#CE93D8' },

  // ── Tier 2: Barracks Lv.6 ────────────────────────────────────────────
  { type: 'knight', name: 'Knight', nameJP: '騎士', emoji: '🐎', tier: 2, archetype: 'strike', color: '#FF9800' },
  { type: 'crossbowman', name: 'Crossbowman', nameJP: '弩兵', emoji: '🎯', tier: 2, archetype: 'ranged', color: '#8BC34A' },
  { type: 'axeman', name: 'Axeman', nameJP: '斧兵', emoji: '🪓', tier: 2, archetype: 'melee', color: '#A1887F' },
  { type: 'slinger', name: 'Slinger', nameJP: '投石兵', emoji: '🥌', tier: 2, archetype: 'ranged', color: '#9E9E9E' },
  { type: 'heavy_shieldman', name: 'Heavy Shieldman', nameJP: '重盾兵', emoji: '🛡️', tier: 2, archetype: 'tank', color: '#78909C' },
  { type: 'shaman', name: 'Shaman', nameJP: '呪術師', emoji: '🪄', tier: 2, archetype: 'caster', color: '#7B1FA2' },

  // ── Tier 3: Barracks Lv.9 ────────────────────────────────────────────
  { type: 'mage', name: 'Mage', nameJP: '魔法使い', emoji: '🔮', tier: 3, archetype: 'caster', color: '#9C27B0' },
  { type: 'paladin', name: 'Paladin', nameJP: '聖騎士', emoji: '✨', tier: 3, archetype: 'tank', color: '#FFF176' },
  { type: 'dragon_knight', name: 'Dragon Knight', nameJP: '竜騎士', emoji: '🐉', tier: 3, archetype: 'strike', color: '#F44336' },
  { type: 'ninja', name: 'Ninja', nameJP: '忍者', emoji: '🥷', tier: 3, archetype: 'strike', color: '#37474F' },
  { type: 'longbowman', name: 'Longbowman', nameJP: '長弓兵', emoji: '🏹', tier: 3, archetype: 'ranged', color: '#66BB6A' },

  // ── Tier 4: Barracks Lv.12 ───────────────────────────────────────────
  { type: 'berserker', name: 'Berserker', nameJP: '狂戦士', emoji: '😤', tier: 4, archetype: 'strike', color: '#D84315' },
  { type: 'priest', name: 'Priest', nameJP: '神官', emoji: '🙏', tier: 4, archetype: 'caster', color: '#FFECB3' },
  { type: 'assassin', name: 'Assassin', nameJP: '暗殺者', emoji: '🥷', tier: 4, archetype: 'strike', color: '#263238' },
  { type: 'golem', name: 'Golem', nameJP: 'ゴーレム', emoji: '🗿', tier: 4, archetype: 'tank', color: '#795548' },
  { type: 'flame_archer', name: 'Flame Archer', nameJP: '炎弓兵', emoji: '🔥', tier: 4, archetype: 'ranged', color: '#FF7043' },

  // ── Tier 5: Barracks Lv.15 ───────────────────────────────────────────
  { type: 'wizard', name: 'Wizard', nameJP: '大魔導士', emoji: '🧙', tier: 5, archetype: 'caster', color: '#673AB7' },
  { type: 'valkyrie', name: 'Valkyrie', nameJP: 'ヴァルキリー', emoji: '👼', tier: 5, archetype: 'strike', color: '#FFD54F' },
  { type: 'samurai', name: 'Samurai', nameJP: '侍', emoji: '⚔️', tier: 5, archetype: 'melee', color: '#E53935' },
  { type: 'griffin_rider', name: 'Griffin Rider', nameJP: 'グリフォンライダー', emoji: '🦅', tier: 5, archetype: 'strike', color: '#8D6E63' },
  { type: 'spirit_archer', name: 'Spirit Archer', nameJP: '精霊弓兵', emoji: '🍃', tier: 5, archetype: 'ranged', color: '#81C784' },
  { type: 'iron_guardian', name: 'Iron Guardian', nameJP: '鉄壁の守護者', emoji: '🧱', tier: 5, archetype: 'tank', color: '#90A4AE' },

  // ── Tier 6: Barracks Lv.18 ───────────────────────────────────────────
  { type: 'necromancer', name: 'Necromancer', nameJP: '死霊術師', emoji: '💀', tier: 6, archetype: 'caster', color: '#4A148C' },
  { type: 'phoenix_knight', name: 'Phoenix Knight', nameJP: '不死鳥騎士', emoji: '🔥', tier: 6, archetype: 'strike', color: '#FF5722' },
  { type: 'crusader', name: 'Crusader', nameJP: '十字軍戦士', emoji: '✝️', tier: 6, archetype: 'tank', color: '#B0BEC5' },
  { type: 'war_elephant', name: 'War Elephant', nameJP: '戦象', emoji: '🐘', tier: 6, archetype: 'tank', color: '#6D4C41' },
  { type: 'heavy_crossbowman', name: 'Heavy Crossbowman', nameJP: '重弩兵', emoji: '🎯', tier: 6, archetype: 'ranged', color: '#33691E' },

  // ── Tier 7: Barracks Lv.21 ───────────────────────────────────────────
  { type: 'archmage', name: 'Archmage', nameJP: '大賢者', emoji: '🔮', tier: 7, archetype: 'caster', color: '#5E35B1' },
  { type: 'dark_knight', name: 'Dark Knight', nameJP: '闇の騎士', emoji: '🌑', tier: 7, archetype: 'melee', color: '#212121' },
  { type: 'beast_tamer', name: 'Beast Tamer', nameJP: '獣使い', emoji: '🐺', tier: 7, archetype: 'ranged', color: '#6D4C41' },
  { type: 'siege_master', name: 'Siege Master', nameJP: '攻城兵', emoji: '💣', tier: 7, archetype: 'ranged', color: '#455A64' },
  { type: 'scale_guard', name: 'Scale Guard', nameJP: '竜鱗兵', emoji: '🦾', tier: 7, archetype: 'tank', color: '#546E7A' },

  // ── Tier 8: Barracks Lv.24 ───────────────────────────────────────────
  { type: 'seraphim', name: 'Seraphim', nameJP: '熾天使', emoji: '😇', tier: 8, archetype: 'caster', color: '#FFF9C4' },
  { type: 'demon_lord', name: 'Demon Lord', nameJP: '魔王', emoji: '👹', tier: 8, archetype: 'strike', color: '#B71C1C' },
  { type: 'thunder_general', name: 'Thunder General', nameJP: '雷将軍', emoji: '⚡', tier: 8, archetype: 'melee', color: '#FBC02D' },
  { type: 'ice_queen', name: 'Ice Queen', nameJP: '氷の女王', emoji: '❄️', tier: 8, archetype: 'caster', color: '#4FC3F7' },
  { type: 'storm_archer', name: 'Storm Archer', nameJP: '嵐弓の射手', emoji: '⛈️', tier: 8, archetype: 'ranged', color: '#37474F' },
  { type: 'molten_colossus', name: 'Molten Colossus', nameJP: '灼熱の巨兵', emoji: '🌋', tier: 8, archetype: 'tank', color: '#BF360C' },

  // ── Tier 9: Barracks Lv.27 ───────────────────────────────────────────
  { type: 'titan', name: 'Titan', nameJP: 'タイタン', emoji: '🏔️', tier: 9, archetype: 'tank', color: '#616161' },
  { type: 'phoenix', name: 'Phoenix', nameJP: '不死鳥', emoji: '🔥', tier: 9, archetype: 'strike', color: '#FF7043' },
  { type: 'kraken_rider', name: 'Kraken Rider', nameJP: 'クラーケンライダー', emoji: '🐙', tier: 9, archetype: 'ranged', color: '#00695C' },
  { type: 'celestial_guardian', name: 'Celestial Guardian', nameJP: '天空の守護者', emoji: '🌟', tier: 9, archetype: 'tank', color: '#FFE082' },
  { type: 'fate_astrologer', name: 'Fate Astrologer', nameJP: '宿命の占星術師', emoji: '🔯', tier: 9, archetype: 'caster', color: '#4527A0' },

  // ── Tier 10: Barracks Lv.30 ──────────────────────────────────────────
  { type: 'dragon_emperor', name: 'Dragon Emperor', nameJP: '竜皇帝', emoji: '🐲', tier: 10, archetype: 'strike', color: '#C62828' },
  { type: 'god_of_war', name: 'God of War', nameJP: '軍神', emoji: '⚔️', tier: 10, archetype: 'melee', color: '#FF6F00' },
  { type: 'cosmic_sorcerer', name: 'Cosmic Sorcerer', nameJP: '宇宙の魔導士', emoji: '🌌', tier: 10, archetype: 'caster', color: '#311B92' },
  { type: 'eternal_king', name: 'Eternal King', nameJP: '永遠の王', emoji: '👑', tier: 10, archetype: 'tank', color: '#FFD700' },
  { type: 'star_marksman', name: 'Star Marksman', nameJP: '星辰の狙撃手', emoji: '🌠', tier: 10, archetype: 'ranged', color: '#26A69A' },
];

/** Base stat multipliers per archetype, applied on top of tier base stats */
const ARCHETYPE_STATS: Record<
  UnitArchetype,
  { hpMult: number; dmgMult: number; speed: number; rangeBase: number; rangeGrowth: number }
> = {
  melee: { hpMult: 1.0, dmgMult: 1.0, speed: 3.0, rangeBase: 1.5, rangeGrowth: 0 },
  ranged: { hpMult: 0.6, dmgMult: 1.45, speed: 2.5, rangeBase: 5.0, rangeGrowth: 0.3 },
  tank: { hpMult: 1.8, dmgMult: 0.6, speed: 2.0, rangeBase: 1.5, rangeGrowth: 0 },
  caster: { hpMult: 0.65, dmgMult: 1.7, speed: 2.2, rangeBase: 4.5, rangeGrowth: 0.35 },
  strike: { hpMult: 0.85, dmgMult: 1.25, speed: 4.2, rangeBase: 1.6, rangeGrowth: 0.05 },
};

/** Base hp/damage/cost for a given unit tier (1-10), before archetype multipliers */
function tierBaseStats(tier: number) {
  return {
    hp: Math.round(70 * Math.pow(1.32, tier - 1)),
    damage: Math.round(12 * Math.pow(1.3, tier - 1)),
    gold: Math.round(40 * Math.pow(1.38, tier - 1)),
    food: Math.round(10 * Math.pow(1.33, tier - 1)),
  };
}

export const UNIT_CONFIGS: Record<UnitType, UnitConfig> = UNIT_META.reduce(
  (acc, meta) => {
    const base = tierBaseStats(meta.tier);
    const arch = ARCHETYPE_STATS[meta.archetype];
    acc[meta.type] = {
      name: meta.name,
      nameJP: meta.nameJP,
      emoji: meta.emoji,
      maxHp: Math.round(base.hp * arch.hpMult),
      cost: { gold: base.gold, food: base.food },
      barracksTier: meta.tier,
      archetype: meta.archetype,
      speed: arch.speed,
      damage: Math.round(base.damage * arch.dmgMult),
      attackRange: Math.round((arch.rangeBase + arch.rangeGrowth * (meta.tier - 1)) * 10) / 10,
      color: meta.color,
    };
    return acc;
  },
  {} as Record<UnitType, UnitConfig>
);

/** Units belonging to each individual tier (1-10) */
export const UNITS_BY_TIER: Record<number, UnitType[]> = UNIT_META.reduce(
  (acc, meta) => {
    (acc[meta.tier] ??= []).push(meta.type);
    return acc;
  },
  {} as Record<number, UnitType[]>
);

/** Barracks level required to unlock a given unit tier (Tier N needs Lv. N*3) */
export function barracksLevelForTier(tier: number): number {
  return tier * 3;
}

/** Highest unit tier unlocked at a given barracks level (0 = nothing trainable yet) */
export function unlockedTierForBarracksLevel(level: number): number {
  return Math.min(MAX_UNIT_TIER, Math.floor(level / 3));
}

/** All unit types trainable from a barracks of the given level (cumulative across unlocked tiers) */
export function unitsForBarracksLevel(level: number): UnitType[] {
  const maxTier = unlockedTierForBarracksLevel(level);
  const result: UnitType[] = [];
  for (let t = 1; t <= maxTier; t++) {
    result.push(...(UNITS_BY_TIER[t] ?? []));
  }
  return result;
}

/**
 * Maximum wounded soldiers a hospital of the given level can hold.
 * Lv.1 → 2 slots, Lv.10 → 20 slots, Lv.30 → 60 slots.
 */
export function hospitalCapacity(level: number): number {
  return level * 2;
}

/**
 * Treatment cost to discharge a wounded unit (40% of base recruit cost).
 */
export function healCost(unitType: UnitType): { gold: number; food: number } {
  const cfg = UNIT_CONFIGS[unitType];
  return {
    gold: Math.max(1, Math.round(cfg.cost.gold * 0.4)),
    food: Math.max(0, Math.round(cfg.cost.food * 0.4)),
  };
}

/** The 4 specialised training facility building types */
export const BARRACKS_TYPES = [
  'barracks_melee',
  'barracks_ranged',
  'barracks_tank',
  'barracks_caster',
  'barracks', // legacy
] as const;

export function isBarracksType(type: string): boolean {
  return BARRACKS_TYPES.includes(type as typeof BARRACKS_TYPES[number]);
}

/** Archetypes trained by each facility type */
export const BARRACKS_ARCHETYPES: Record<string, UnitArchetype[]> = {
  barracks_melee:   ['melee', 'strike'],
  barracks_ranged:  ['ranged'],
  barracks_tank:    ['tank'],
  barracks_caster:  ['caster'],
  barracks:         ['melee', 'ranged', 'tank', 'caster', 'strike'], // legacy fallback
};

/** Display config for each training facility */
export const BARRACKS_DISPLAY: Record<string, { emoji: string; label: string; color: string }> = {
  barracks_melee:   { emoji: '⚔️',  label: '剣士訓練所', color: '#e53935' },
  barracks_ranged:  { emoji: '🏹',  label: '弓兵訓練所', color: '#4caf50' },
  barracks_tank:    { emoji: '🛡️', label: '盾兵訓練所', color: '#607d8b' },
  barracks_caster:  { emoji: '🔮',  label: '魔法訓練所', color: '#9c27b0' },
  barracks:         { emoji: '⚔️',  label: '兵舎',       color: '#d0021b' },
};

/** Units trainable from a specific facility type at a given level */
export function unitsForBarracksType(barracksType: string, level: number): UnitType[] {
  const archetypes = BARRACKS_ARCHETYPES[barracksType] ?? BARRACKS_ARCHETYPES['barracks'];
  const maxTier = unlockedTierForBarracksLevel(level);
  return UNIT_META
    .filter((m) => m.tier <= maxTier && archetypes.includes(m.archetype))
    .map((m) => m.type);
}

/** Stat multipliers for unit levels 1, 2, 3 */
export const UNIT_LEVEL_MULT = [
  { hp: 1.0, damage: 1.0, costMult: 1.0 },  // Lv1
  { hp: 1.8, damage: 1.6, costMult: 2.5 },  // Lv2
  { hp: 3.2, damage: 2.6, costMult: 5.5 },  // Lv3
];

/**
 * Max unit level by town level (0-indexed).
 * Lv.1-10  → unit max Lv.1
 * Lv.11-20 → unit max Lv.2
 * Lv.21-30 → unit max Lv.3
 */
export function maxUnitLevelForTown(townLevel: number): number {
  return Math.min(Math.floor(townLevel / 10) + 1, 3);
}

/**
 * Max barracks level by town level (0-indexed).
 * A barracks can merge up to Lv.(townLevel + 1) — i.e. its displayed level
 * cap always matches the town's current displayed level, up to Lv.30.
 */
export function maxBuildingLevelForTown(townLevel: number): number {
  return Math.min(30, townLevel + 1);
}

/** Backwards-compatible alias for the training-facility level cap. */
export const maxBarracksLevelForTown = maxBuildingLevelForTown;

/**
 * Number of non-townhall buildings required to reach each town level (0-indexed).
 * Index = town level 0..29. Value = buildings needed.
 */
export const BUILDINGS_FOR_LEVEL: number[] = [
   0,  1,  2,  3,  4,  5,  6,  7,  8,  9,
  10, 12, 14, 16, 18, 20, 22, 25, 28, 31,
  34, 38, 42, 46, 50, 54, 58, 62, 66, 70,
];

/**
 * Unlocked grid columns per town level (0-indexed 0..29).
 */
export const UNLOCK_COLS_BY_LEVEL: number[] = [
   6,  6,  6,  6,  6,  6,
   8,  8,  8,  8,  8,  8,
  10, 10, 10, 10, 10, 10,
  12, 12, 12, 12, 12, 12,
  14, 14, 14, 14, 14, 14,
];

/**
 * Cost & time required to level up the Town Hall from `currentLevel` (0-indexed)
 * to `currentLevel + 1`. Requires large amounts of wood + stone, and takes real time.
 */
export function townHallUpgradeCost(currentLevel: number): { wood: number; stone: number; timeSec: number } {
  const wood = Math.round(150 * Math.pow(1.22, currentLevel));
  const stone = Math.round(90 * Math.pow(1.24, currentLevel));
  const timeSec = Math.round(30 + currentLevel * 18);
  return { wood, stone, timeSec };
}

export const LUMBERMILL_WOOD_PER_SEC = 4;
export const QUARRY_STONE_PER_SEC = 3;

/** Per-level gameplay growth for buildings whose level affects combat or production. */
export const BUILDING_LEVEL_GROWTH: Partial<Record<BuildingType, number>> = {
  wall: 0.25,
  tower: 0.25,
  house: 0.25,
  farm: 0.25,
  mine: 0.25,
  lumbermill: 0.25,
  quarry: 0.25,
};

/** Level 1 keeps the current baseline; later levels grow linearly by building type. */
export function buildingLevelMultiplier(type: BuildingType, level: number): number {
  const growth = BUILDING_LEVEL_GROWTH[type] ?? 0;
  return 1 + Math.max(0, level - 1) * growth;
}

/**
 * Resource storage caps per town level (0-indexed 0..29).
 */
export const RESOURCE_CAPS_BY_LEVEL: { gold: number; food: number }[] = [
  { gold:    500, food:    150 },  // Lv 1
  { gold:    700, food:    200 },  // Lv 2
  { gold:    900, food:    250 },  // Lv 3
  { gold:   1200, food:    320 },  // Lv 4
  { gold:   1500, food:    400 },  // Lv 5
  { gold:   2000, food:    500 },  // Lv 6
  { gold:   2500, food:    650 },  // Lv 7
  { gold:   3200, food:    800 },  // Lv 8
  { gold:   4000, food:   1000 },  // Lv 9
  { gold:   5000, food:   1300 },  // Lv10
  { gold:   6500, food:   1600 },  // Lv11
  { gold:   8000, food:   2000 },  // Lv12
  { gold:  10000, food:   2500 },  // Lv13
  { gold:  13000, food:   3200 },  // Lv14
  { gold:  16000, food:   4000 },  // Lv15
  { gold:  20000, food:   5000 },  // Lv16
  { gold:  25000, food:   6500 },  // Lv17
  { gold:  32000, food:   8000 },  // Lv18
  { gold:  40000, food:  10000 },  // Lv19
  { gold:  50000, food:  13000 },  // Lv20
  { gold:  65000, food:  16000 },  // Lv21
  { gold:  80000, food:  20000 },  // Lv22
  { gold: 100000, food:  25000 },  // Lv23
  { gold: 130000, food:  32000 },  // Lv24
  { gold: 160000, food:  40000 },  // Lv25
  { gold: 200000, food:  50000 },  // Lv26
  { gold: 250000, food:  65000 },  // Lv27
  { gold: 320000, food:  80000 },  // Lv28
  { gold: 400000, food: 100000 },  // Lv29
  { gold: 500000, food: 130000 },  // Lv30
];

/** Returns true if this grid cell is accessible at the given town level */
export function isCellUnlocked(col: number, _row: number, townLevel: number): boolean {
  const unlockCols = UNLOCK_COLS_BY_LEVEL[Math.min(townLevel, UNLOCK_COLS_BY_LEVEL.length - 1)];
  return col < unlockCols;
}

/**
 * Resource storage caps (gold/food/wood/stone) for a given town level (0-indexed).
 * Lv.1-20 use the tuned early/mid-game curve above. Lv.21-30 grow ~4.3x per level
 * (instead of flattening out) so storage keeps pace with bulk-build costs, which
 * double per building level — this makes Lv.30 bulk builds attainable at a Lv.30 town.
 */
const HIGH_LEVEL_CAP_GROWTH = 4.3;
const HIGH_LEVEL_CAP_START_INDEX = 19; // Lv.20 (0-indexed)

export function resourceCapsForLevel(townLevel: number): { gold: number; food: number; wood: number; stone: number } {
  const idx = Math.min(townLevel, RESOURCE_CAPS_BY_LEVEL.length - 1);
  if (idx <= HIGH_LEVEL_CAP_START_INDEX) {
    const base = RESOURCE_CAPS_BY_LEVEL[idx];
    return {
      gold: base.gold,
      food: base.food,
      wood: Math.round(base.food * 1.6),
      stone: Math.round(base.food * 1.2),
    };
  }
  const base = RESOURCE_CAPS_BY_LEVEL[HIGH_LEVEL_CAP_START_INDEX];
  const mult = Math.pow(HIGH_LEVEL_CAP_GROWTH, idx - HIGH_LEVEL_CAP_START_INDEX);
  return {
    gold: Math.round(base.gold * mult),
    food: Math.round(base.food * mult),
    wood: Math.round(base.food * 1.6 * mult),
    stone: Math.round(base.food * 1.2 * mult),
  };
}

export const TOWER_RANGE = 7;
export const TOWER_DAMAGE = 20;
export const TOWER_FIRE_RATE = 1.5;

export const HOUSE_GOLD_PER_SEC = 3;
export const MINE_GOLD_PER_SEC = 8;
export const FARM_FOOD_PER_SEC = 2;

/** ── 陣形 (Formation) system ─────────────────────────────────────────────
 * Governs how player units are arranged when battle starts and applies
 * combat stat multipliers reflecting each formation's real-world tactics.
 */
export interface FormationConfig {
  nameJP: string;
  icon: string;
  desc: string;
  /** Outgoing damage multiplier applied to all units in this formation */
  atkMult: number;
  /** Effective toughness multiplier (applied to HP) reflecting defensive solidity */
  defMult: number;
  /** Movement speed multiplier */
  speedMult: number;
}

export const FORMATION_CONFIGS: Record<FormationType, FormationConfig> = {
  suikou: {
    nameJP: '錐行',
    icon: '🔺',
    desc: '先端に盾兵を置いて最初の衝突を受け止め、剣士がその後ろから突破口を押し広げる。弓兵・魔法兵は最後方から支援火力を出す、壊れやすいが火力の高い攻撃特化の陣。',
    atkMult: 1.4,
    defMult: 0.8,
    speedMult: 1.05,
  },
  gyorin: {
    nameJP: '魚鱗',
    icon: '🐟',
    desc: '錐行と考え方は同じだが層が厚い。前列の盾兵が壊れても中列の剣士が次の壁になり、後列の弓・魔法が絶え間なく攻撃し続けられる持久戦向きの陣。',
    atkMult: 1.2,
    defMult: 1.05,
    speedMult: 1.0,
  },
  kakuyoku: {
    nameJP: '鶴翼',
    icon: '🦅',
    desc: '中央の魔法兵を守るように内側は剣士で固め、翼の外側ほど弓兵にして包囲しながら側面・背後から射撃する。中央が薄く、正面を突破されると総崩れになりやすい。',
    atkMult: 1.15,
    defMult: 0.9,
    speedMult: 1.0,
  },
  houen: {
    nameJP: '方円',
    icon: '⭕',
    desc: '外周は盾兵と剣士の盾壁、内側に弓兵のリング、最中心を魔法兵が守られた状態で支援する三重構造。防御に極振りした陣。',
    atkMult: 0.9,
    defMult: 1.4,
    speedMult: 0.75,
  },
  gankou: {
    nameJP: '雁行',
    icon: '➰',
    desc: '前方の弓兵が先制射撃し、中列の剣士がフォロー、後方は盾兵と魔法兵で守りを固める。各部隊が独立して動けるので機動戦や側面展開がしやすい。',
    atkMult: 1.05,
    defMult: 1.0,
    speedMult: 1.2,
  },
  chouda: {
    nameJP: '長蛇',
    icon: '🐍',
    desc: '縦列の前後を盾兵で挟み、中間に剣士・弓兵・魔法兵をまとめる。行軍や追撃には向くが、側面をつかれると分断されやすい。',
    atkMult: 1.1,
    defMult: 0.75,
    speedMult: 1.3,
  },
};

/** Combat role a unit plays within a formation, derived from its archetype. */
export type FormationRole = 'tank' | 'melee' | 'ranged' | 'caster';

export function formationRoleOf(archetype: UnitArchetype): FormationRole {
  if (archetype === 'tank') return 'tank';
  if (archetype === 'ranged') return 'ranged';
  if (archetype === 'caster') return 'caster';
  return 'melee'; // 'melee' and 'strike' both fight in the front/mid line
}

/** Safe playable rectangle (relative to the deployment anchor) that formation offsets are clamped into. */
const FORMATION_MAX_DX_BACK = 9;   // how far back (behind anchor) units may be placed
const FORMATION_MAX_DX_FWD = 6;    // how far forward (toward enemy) units may be placed
const FORMATION_MAX_DZ = 15;       // max lateral spread each side of anchor

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Groups unit indices by their formation role, preserving original relative order within each role. */
function groupByRole(archetypes: UnitArchetype[]): Record<FormationRole, number[]> {
  const groups: Record<FormationRole, number[]> = { tank: [], melee: [], ranged: [], caster: [] };
  archetypes.forEach((a, i) => groups[formationRoleOf(a)].push(i));
  return groups;
}

/**
 * Places role groups in front-to-back "depth" layers (index 0 = frontmost / most
 * forward dx). Each layer tapers/widens relative to the layer in front of it,
 * producing a wedge-like silhouette shared by 錐行 and 魚鱗.
 */
function layeredRoleOffsets(
  groups: Record<FormationRole, number[]>,
  order: FormationRole[],
  spacing: number,
  stepX: number,
  widenPerDepth: number,
  out: { dx: number; dz: number }[]
) {
  order.forEach((role, depth) => {
    const idxs = groups[role];
    const m = idxs.length;
    idxs.forEach((origIdx, j) => {
      const centered = j - (m - 1) / 2;
      const dz = centered * spacing * (1 + depth * widenPerDepth);
      const dx = -depth * stepX - Math.abs(dz) * 0.25;
      out[origIdx] = { dx, dz };
    });
  });
}

/**
 * Computes the (dx, dz) spawn offset for every unit in the roster, relative to
 * the player's forward-deployment anchor point, for a given formation. Offsets
 * are role-aware (tank/melee/ranged/caster) so each formation reproduces the
 * real tactical layout it represents. Spacing shrinks as the army grows so the
 * whole formation stays within the playable area.
 */
export function computeFormationOffsets(
  formation: FormationType,
  archetypes: UnitArchetype[]
): { dx: number; dz: number }[] {
  const n = archetypes.length;
  const out: { dx: number; dz: number }[] = new Array(n).fill(null).map(() => ({ dx: 0, dz: 0 }));
  if (n === 0) return out;

  const groups = groupByRole(archetypes);
  // Shrink spacing as the army grows so the whole formation stays on the battlefield.
  const SPACING = n > 1 ? Math.min(1.4, (FORMATION_MAX_DZ * 1.8) / n) : 1.4;

  switch (formation) {
    case 'suikou': {
      // Wedge: tank tip absorbs the first clash, melee widens the breach behind it,
      // ranged/caster support fire from the very back. Thin layers = fragile but sharp.
      layeredRoleOffsets(groups, ['tank', 'melee', 'ranged', 'caster'], SPACING * 0.85, 2.6, 0.35, out);
      break;
    }
    case 'gyorin': {
      // Fish-scale: same front-to-back order as 錐行 but thicker, more evenly spaced
      // layers so a broken front rank is instantly backed up by the next.
      layeredRoleOffsets(groups, ['tank', 'melee', 'ranged', 'caster'], SPACING, 1.7, 0.15, out);
      break;
    }
    case 'kakuyoku': {
      // Crane wings: caster protected near the center, melee forms an inner wall,
      // ranged wraps around on the outer wings and curves forward to envelop.
      const roleSpread: Record<FormationRole, number> = { caster: 0.55, melee: 1.0, ranged: 1.7, tank: 1.0 };
      const roleBackset: Record<FormationRole, number> = { caster: -1.2, melee: 0, ranged: 0, tank: 0 };
      (['caster', 'melee', 'tank', 'ranged'] as FormationRole[]).forEach((role) => {
        const idxs = groups[role];
        const m = idxs.length;
        idxs.forEach((origIdx, j) => {
          const centered = j - (m - 1) / 2;
          const dz = centered * SPACING * roleSpread[role];
          const dx = role === 'ranged' ? Math.abs(dz) * 0.55 : roleBackset[role];
          out[origIdx] = { dx, dz };
        });
      });
      break;
    }
    case 'houen': {
      // Triple ring: outer shield wall (tank+melee), a ring of archers inside it,
      // and casters protected at the very center. All-round, no exposed flank.
      const outerIdxs = [...groups.tank, ...groups.melee];
      const midIdxs = groups.ranged;
      const innerIdxs = groups.caster;
      const baseRadius = Math.min(FORMATION_MAX_DZ * 0.6, Math.max(2.5, Math.sqrt(n) * 1.3));
      const ring = (idxs: number[], radius: number, phase: number) => {
        const m = idxs.length;
        idxs.forEach((origIdx, j) => {
          const angle = phase + (j / Math.max(m, 1)) * Math.PI * 2;
          out[origIdx] = { dx: Math.cos(angle) * radius, dz: Math.sin(angle) * radius };
        });
      };
      ring(outerIdxs, baseRadius, 0);
      ring(midIdxs, baseRadius * 0.6, Math.PI / 6);
      ring(innerIdxs, Math.min(1.5, baseRadius * 0.2), Math.PI / 3);
      break;
    }
    case 'gankou': {
      // Echelon: ranged skirmish forward, melee follows up, tank & caster held at
      // the rear. Each unit also steps diagonally so units can act independently.
      layeredRoleOffsets(groups, ['ranged', 'melee', 'tank', 'caster'], SPACING * 0.9, 2.2, 0.1, out);
      // Diagonal stagger for the "each unit offset from the last" echelon look.
      for (let i = 0; i < n; i++) {
        out[i] = { dx: out[i].dx - i * 0.12, dz: out[i].dz + i * 0.18 };
      }
      break;
    }
    case 'chouda': {
      // Long snake: a tank sandwiches each end of the column, melee/ranged/caster
      // travel mixed together in the middle for the march.
      const tankIdxs = groups.tank;
      const half = Math.ceil(tankIdxs.length / 2);
      const frontTanks = tankIdxs.slice(0, half);
      const rearTanks = tankIdxs.slice(half);
      const middle = [...groups.melee, ...groups.ranged, ...groups.caster];
      const column = [...frontTanks, ...middle, ...rearTanks];
      const stepX = n > 1 ? Math.min(1.3, (FORMATION_MAX_DX_BACK + FORMATION_MAX_DX_FWD) / n) : 1.3;
      column.forEach((origIdx, k) => {
        out[origIdx] = { dx: FORMATION_MAX_DX_FWD - k * stepX, dz: (Math.random() - 0.5) * 0.6 };
      });
      break;
    }
  }

  for (let i = 0; i < n; i++) {
    out[i] = {
      dx: clamp(out[i].dx, -FORMATION_MAX_DX_BACK, FORMATION_MAX_DX_FWD),
      dz: clamp(out[i].dz, -FORMATION_MAX_DZ, FORMATION_MAX_DZ),
    };
  }
  return out;
}
