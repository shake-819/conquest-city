/** Player-selectable battle strategy that governs player unit AI */
export type BattleStrategy =
  | 'base_rush'    // 本拠地破壊特化
  | 'massacre'     // 虐殺（全敵ユニット殲滅→本拠地）
  | 'defend'       // 守備特化（敵が来るまで陣地を守る）
  | 'frontline'    // 前線キープ（中盤で止まって戦う）
  | 'wave_attack'; // 波状攻撃（8s前進→5s待機を繰り返す）

/** Player-selectable battle formation (陣形). Affects unit deployment shape and combat stats. */
export type FormationType =
  | 'suikou'   // 錐行 - 少数精鋭の先鋭攻撃陣、側面が薄い
  | 'gyorin'   // 魚鱗 - 層の厚い持久攻撃陣
  | 'kakuyoku' // 鶴翼 - 両翼包囲陣、中央が薄い
  | 'houen'    // 方円 - 全方位防御陣
  | 'gankou'   // 雁行 - 斜行機動陣
  | 'chouda';  // 長蛇 - 縦列陣

export type BuildingType =
  | 'townhall'
  | 'house'
  | 'barracks'          // legacy (save compat)
  | 'barracks_melee'    // 剣士訓練所
  | 'barracks_ranged'   // 弓兵訓練所
  | 'barracks_tank'     // 盾兵訓練所
  | 'barracks_caster'   // 魔法訓練所
  | 'tower'
  | 'wall'
  | 'farm'
  | 'mine'
  | 'lumbermill'
  | 'quarry'
  | 'hospital'
  | 'research_lab';

export type UnitType =
  // Tier 1
  | 'soldier'
  | 'archer'
  | 'spearman'
  | 'guard'
  | 'apprentice_mage'
  // Tier 2
  | 'knight'
  | 'crossbowman'
  | 'axeman'
  | 'slinger'
  | 'heavy_shieldman'
  | 'shaman'
  // Tier 3
  | 'mage'
  | 'paladin'
  | 'dragon_knight'
  | 'ninja'
  | 'longbowman'
  // Tier 4
  | 'berserker'
  | 'priest'
  | 'assassin'
  | 'golem'
  | 'flame_archer'
  // Tier 5
  | 'wizard'
  | 'valkyrie'
  | 'samurai'
  | 'griffin_rider'
  | 'spirit_archer'
  | 'iron_guardian'
  // Tier 6
  | 'necromancer'
  | 'phoenix_knight'
  | 'crusader'
  | 'war_elephant'
  | 'heavy_crossbowman'
  // Tier 7
  | 'archmage'
  | 'dark_knight'
  | 'beast_tamer'
  | 'siege_master'
  | 'scale_guard'
  // Tier 8
  | 'seraphim'
  | 'demon_lord'
  | 'thunder_general'
  | 'ice_queen'
  | 'storm_archer'
  | 'molten_colossus'
  // Tier 9
  | 'titan'
  | 'phoenix'
  | 'kraken_rider'
  | 'celestial_guardian'
  | 'fate_astrologer'
  // Tier 10
  | 'dragon_emperor'
  | 'god_of_war'
  | 'cosmic_sorcerer'
  | 'eternal_king'
  | 'star_marksman';

export type FactionType = 'player' | 'enemy';

export interface Building {
  id: string;
  type: BuildingType;
  gridX: number;
  gridZ: number;
  hp: number;
  maxHp: number;
  faction: FactionType;
  level: number;
  productionTimer: number;
}

export interface TownUnit {
  id: string;
  type: UnitType;
  level: number; // 1, 2, 3
  gridX: number;
  gridZ: number;
}

/** A unit that was hospitalized after being killed in battle */
export interface WoundedUnit {
  id: string;       // unique record ID
  unitType: UnitType;
  unitLevel: number;
  goldCost: number; // treatment cost (40% of recruit)
  foodCost: number;
}

export interface Unit {
  id: string;
  type: UnitType;
  faction: FactionType;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  attackRange: number;
  attackCooldown: number;
  attackTimer: number;
  targetId: string | null;
  state: 'idle' | 'moving' | 'attacking';
  /** ID of the originating TownUnit (player units only) */
  townUnitId?: string;
}

/** Unit role a hero commands. It is intentionally aligned with UnitConfig archetypes. */
export type HeroArchetype = 'melee' | 'ranged' | 'tank' | 'caster' | 'strike';

/** Rarity is data-driven so new hero progression systems can be added later. */
export type HeroRarity = 'common' | 'rare' | 'legendary';

/** Skills are intentionally open to future effects such as healing and shielding. */
export type HeroSkillKind = 'multi_attack' | 'archetype_buff' | 'heal' | 'shield';

export interface BattleHero {
  id: string;
  definitionId: string;
  archetype: HeroArchetype;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  damage: number;
  attackRange: number;
  speed: number;
  attackCooldown: number;
  attackTimer: number;
  skillTimer: number;
  skillActiveTimer: number;
  activeBuffDamageMult: number;
  activeBuffSpeedMult: number;
  synergyScore: number;
  synergyCount: number;
  synergyAverageTier: number;
  state: 'idle' | 'moving' | 'attacking' | 'skill';
  skillRequested: boolean;
}

export interface Projectile {
  id: string;
  x: number;
  z: number;
  y: number;
  targetX: number;
  targetZ: number;
  damage: number;
  faction: FactionType;
  speed: number;
  sourceId: string;
}

export interface Resources {
  gold: number;
  wood: number;
  food: number;
  stone: number;
}

export type GamePhase = 'menu' | 'playing' | 'victory' | 'defeat';

export interface Stage {
  number: number;
  wave: number;
  maxWaves: number;
  enemyStrength: number;
}

export const GRID_SIZE = 30;
export const CELL_SIZE = 2;
