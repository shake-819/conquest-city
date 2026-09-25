import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type {
  Building,
  Unit,
  Projectile,
  Resources,
  BuildingType,
  UnitType,
  TownUnit,
  WoundedUnit,
  BattleStrategy,
  FormationType,
  BattleHero,
} from './types';
import {
  BUILDING_CONFIGS,
  UNIT_CONFIGS,
  TOWER_RANGE,
  TOWER_DAMAGE,
  TOWER_FIRE_RATE,
  HOUSE_GOLD_PER_SEC,
  MINE_GOLD_PER_SEC,
  FARM_FOOD_PER_SEC,
  LUMBERMILL_WOOD_PER_SEC,
  QUARRY_STONE_PER_SEC,
  buildingLevelMultiplier,
  UNIT_LEVEL_MULT,
  UNLOCK_COLS_BY_LEVEL,
  isCellUnlocked,
  resourceCapsForLevel,
  townHallUpgradeCost,
  MAX_TOWN_LEVEL,
  maxUnitLevelForTown,
  maxBuildingLevelForTown,
  barracksLevelForTier,
  unlockedTierForBarracksLevel,
  UNITS_BY_TIER,
  isBarracksType,
  unitsForBarracksType,
  hospitalCapacity,
  healCost,
  FORMATION_CONFIGS,
  computeFormationOffsets,
} from './constants';
import {
  HERO_DEFINITIONS,
  calculateHeroSynergy,
  heroById,
  heroStarRank,
} from './heroes';
import {
  RESEARCH_DEFINITIONS,
  buildingHpResearchMultiplier,
  heroResearchMultipliers,
  researchNodeById,
  resourceProductionResearchMultiplier,
  unitResearchMultipliers,
} from './research';

export type GameMode = 'menu' | 'town' | 'stage_select' | 'battle_settings' | 'battle' | 'stage_clear' | 'victory' | 'defeat';
export type BattleSettingsOrigin = 'menu' | 'town' | 'stage_select';
export type SelectedTool = BuildingType | 'select' | 'demolish';

export const TOWN_COLS = 14;
export const TOWN_ROWS = 9;

const BATTLE_CELL = 2.5;
const BATTLE_COLS = 28;
const BATTLE_ROWS = 14;
const PLAYER_ZONE_COLS = 11;

function bWorldX(col: number) {
  return col * BATTLE_CELL - (BATTLE_COLS * BATTLE_CELL) / 2;
}
function bWorldZ(row: number) {
  return row * BATTLE_CELL - (BATTLE_ROWS * BATTLE_CELL) / 2;
}

function dist(ax: number, az: number, bx: number, bz: number) {
  return Math.sqrt((ax - bx) ** 2 + (az - bz) ** 2);
}

function unitDamageWithHero(unit: Unit, hero: BattleHero | null): number {
  if (
    hero &&
    hero.hp > 0 &&
    hero.skillActiveTimer > 0 &&
    unit.faction === 'player' &&
    unitDamageArchetype(unit) === hero.archetype
  ) {
    return Math.round(unit.damage * hero.activeBuffDamageMult);
  }
  return unit.damage;
}

function unitSpeedWithHero(unit: Unit, hero: BattleHero | null): number {
  if (
    hero &&
    hero.hp > 0 &&
    hero.skillActiveTimer > 0 &&
    unit.faction === 'player' &&
    unitDamageArchetype(unit) === hero.archetype
  ) {
    return unit.speed * hero.activeBuffSpeedMult;
  }
  return unit.speed;
}

function unitDamageArchetype(unit: Unit) {
  return UNIT_CONFIGS[unit.type].archetype;
}

export type TownGrid = (Building | null)[][];

function emptyGrid(): TownGrid {
  return Array.from({ length: TOWN_ROWS }, () => Array(TOWN_COLS).fill(null));
}

function initGrid(): TownGrid {
  const g = emptyGrid();
  g[Math.floor(TOWN_ROWS / 2)][1] = {
    id: 'player-base',
    type: 'townhall',
    gridX: 1,
    gridZ: Math.floor(TOWN_ROWS / 2),
    hp: 600,
    maxHp: 600,
    faction: 'player',
    level: 1,
    productionTimer: 0,
  };
  return g;
}

function gridToBuildings(grid: TownGrid): Building[] {
  const out: Building[] = [];
  for (const row of grid) {
    for (const cell of row) {
      if (cell) out.push(cell);
    }
  }
  return out;
}

function makeBattleBuildings(grid: TownGrid, researchedIds: string[]): Building[] {
  const buildings: Building[] = [];
  for (let row = 0; row < TOWN_ROWS; row++) {
    for (let col = 0; col < TOWN_COLS; col++) {
      const cell = grid[row][col];
      if (!cell) continue;
      const bCol = Math.min(col + 1, PLAYER_ZONE_COLS - 1);
      const bRow = Math.floor(row * (BATTLE_ROWS / TOWN_ROWS));
      const hpMultiplier = buildingHpResearchMultiplier(researchedIds, cell.type);
      const levelMultiplier = buildingLevelMultiplier(cell.type, cell.level);
      const baseMaxHp = BUILDING_CONFIGS[cell.type]?.maxHp ?? cell.maxHp;
      const maxHp = Math.round(baseMaxHp * levelMultiplier * hpMultiplier);
      const hpRatio = cell.maxHp > 0 ? Math.min(1, Math.max(0, cell.hp / cell.maxHp)) : 1;
      buildings.push({
        ...cell,
        gridX: bCol,
        gridZ: bRow,
        hp: Math.min(Math.round(maxHp * hpRatio), maxHp),
        maxHp,
      });
    }
  }
  const enemyBase: Building = {
    id: 'enemy-base',
    type: 'townhall',
    gridX: BATTLE_COLS - 2,
    gridZ: Math.floor(BATTLE_ROWS / 2),
    hp: 400,
    maxHp: 400,
    faction: 'enemy',
    level: 1,
    productionTimer: 0,
  };
  buildings.push(enemyBase);
  return buildings;
}

function townUnitsToPlayerUnits(townUnits: TownUnit[], formation: FormationType, researchedIds: string[]): Unit[] {
  const fCfg = FORMATION_CONFIGS[formation];
  const anchorX = bWorldX(2);
  const anchorZ = bWorldZ(Math.floor(BATTLE_ROWS / 2));
  // Safety bounds so no formation math can ever place a unit outside the player's zone.
  const minX = bWorldX(0) + 1;
  const maxX = bWorldX(PLAYER_ZONE_COLS - 1) - 1;
  const minZ = bWorldZ(0) + 1;
  const maxZ = bWorldZ(BATTLE_ROWS - 1) - 1;
  const n = townUnits.length;
  const archetypes = townUnits.map((tu) => UNIT_CONFIGS[tu.type].archetype);
  const offsets = computeFormationOffsets(formation, archetypes);
  // All units in a formation march at the same speed so faster archetypes (e.g. cavalry)
  // can't outrun the rest and break the formation shape while advancing. Gankou (雁行) is
  // the one formation explicitly meant for independent movement, so it keeps per-unit speed.
  const avgBaseSpeed = townUnits.reduce((sum, tu) => sum + UNIT_CONFIGS[tu.type].speed, 0) / Math.max(n, 1);
  const marchSpeed = avgBaseSpeed * fCfg.speedMult;
  return townUnits.map((tu, i) => {
    const cfg = UNIT_CONFIGS[tu.type];
    const research = unitResearchMultipliers(researchedIds, cfg.archetype);
    const mult = UNIT_LEVEL_MULT[Math.min(tu.level - 1, UNIT_LEVEL_MULT.length - 1)];
    const { dx, dz } = offsets[i];
     const baseHp = Math.round(cfg.maxHp * mult.hp * fCfg.defMult * research.hp);
    return {
      id: nanoid(),
      townUnitId: tu.id,
      type: tu.type,
      faction: 'player' as const,
      x: Math.min(maxX, Math.max(minX, anchorX + dx)),
      z: Math.min(maxZ, Math.max(minZ, anchorZ + dz)),
      hp: baseHp,
      maxHp: baseHp,
      speed: formation === 'gankou' ? cfg.speed * fCfg.speedMult : marchSpeed,
       damage: Math.round(cfg.damage * mult.damage * fCfg.atkMult * research.damage),
      attackRange: cfg.attackRange,
      attackCooldown: 1.0,
      attackTimer: 0,
      targetId: null,
      state: 'moving' as const,
    };
  });
}

function createBattleHero(selectedHeroId: string | null, townUnits: TownUnit[], researchedIds: string[]): BattleHero | null {
  const definition = heroById(selectedHeroId);
  if (!definition) return null;
  const synergy = calculateHeroSynergy(definition, townUnits);
  const research = heroResearchMultipliers(researchedIds);
  const anchorX = bWorldX(2);
  const anchorZ = bWorldZ(Math.floor(BATTLE_ROWS / 2));
  return {
    id: nanoid(),
    definitionId: definition.id,
    archetype: definition.archetype,
    x: anchorX - 1.8,
    z: anchorZ,
     hp: Math.round(definition.baseHp * (0.9 + synergy.score * 0.1) * research.hp),
     maxHp: Math.round(definition.baseHp * (0.9 + synergy.score * 0.1) * research.hp),
     damage: Math.round(definition.baseDamage * synergy.score * research.damage),
    attackRange: definition.attackRange,
    speed: definition.speed,
    attackCooldown: 1.4,
    attackTimer: 0,
    skillTimer: 0,
    skillActiveTimer: 0,
    activeBuffDamageMult: 1,
    activeBuffSpeedMult: 1,
    synergyScore: synergy.score,
    synergyCount: synergy.matchingCount,
    synergyAverageTier: synergy.averageTier,
    state: 'idle',
    skillRequested: false,
  };
}

function spawnWave(wave: number, stageIndex: number): Unit[] {
  const baseCount = 5 + wave * 2 + stageIndex * 3;
  const strength = 1 + stageIndex * 0.35 + wave * 0.12;

  // Enemy unit pool scales with stage index
  const unitPool: UnitType[] =
    stageIndex < 2
      ? ['soldier', 'soldier', 'archer']
      : stageIndex < 4
      ? ['soldier', 'archer', 'spearman', 'knight']
      : ['spearman', 'knight', 'mage', 'paladin', 'dragon_knight'];

  const units: Unit[] = [];
  for (let i = 0; i < baseCount; i++) {
    const type = unitPool[i % unitPool.length];
    const cfg = UNIT_CONFIGS[type];
    const spawnRow = Math.floor(Math.random() * BATTLE_ROWS);
    units.push({
      id: nanoid(),
      type,
      faction: 'enemy',
      x: bWorldX(BATTLE_COLS - 1) + Math.random() * 2,
      z: bWorldZ(spawnRow),
      hp: Math.round(cfg.maxHp * strength),
      maxHp: Math.round(cfg.maxHp * strength),
      speed: cfg.speed * 0.85,
      damage: Math.round(cfg.damage * strength),
      attackRange: cfg.attackRange,
      attackCooldown: 1.0,
      attackTimer: 0,
      targetId: null,
      state: 'moving',
    });
  }
  return units;
}

const STAGE_NAMES = ['1-1', '1-2', '1-3', '2-1', '2-2', '2-3'];
const MAX_STAGE_WAVES = [3, 4, 5, 4, 5, 6];
/** Star-rating difficulty shown on the stage select screen (1-4). Shared with hero shard rewards. */
const STAGE_DIFFICULTY_STARS = [1, 2, 3, 2, 3, 4];

/**
 * Rarity odds for a stage-clear hero shard drop, keyed by the stage's difficulty stars.
 * Harder stages skew toward rarer shards; the fallback bucket is 'common'.
 */
const HERO_SHARD_RARITY_ODDS: Record<number, { common: number; rare: number; legendary: number }> = {
  1: { common: 0.85, rare: 0.15, legendary: 0 },
  2: { common: 0.6, rare: 0.35, legendary: 0.05 },
  3: { common: 0.35, rare: 0.45, legendary: 0.2 },
  4: { common: 0.15, rare: 0.45, legendary: 0.4 },
};

interface HeroShardReward {
  heroId: string;
  heroNameJP: string;
  amount: number;
}

/** Rolls a stage-clear hero shard reward: which hero, and how many shards (1-5, more on harder stages). */
function rollHeroShardReward(stageIndex: number): HeroShardReward | null {
  const stars = STAGE_DIFFICULTY_STARS[stageIndex] ?? 1;
  const odds = HERO_SHARD_RARITY_ODDS[stars] ?? HERO_SHARD_RARITY_ODDS[1];
  const roll = Math.random();
  const rarity = roll < odds.legendary
    ? 'legendary'
    : roll < odds.legendary + odds.rare
      ? 'rare'
      : 'common';
  const pool = HERO_DEFINITIONS.filter((hero) => hero.rarity === rarity);
  const candidates = pool.length > 0 ? pool : HERO_DEFINITIONS;
  if (candidates.length === 0) return null;
  const hero = candidates[Math.floor(Math.random() * candidates.length)];
  const amount = Math.min(5, stars + Math.floor(Math.random() * 2));
  return { heroId: hero.id, heroNameJP: hero.nameJP, amount };
}

interface StageClearHeroPatch {
  heroShards: Record<string, number>;
  ownedHeroIds: string[];
  selectedHeroId: string | null;
  rewardMsg: string;
}

/**
 * Applies a stage-clear hero shard drop on top of the current hero state.
 * Newly-unlocked heroes (first time crossing the ☆1 threshold) are added to
 * ownedHeroIds automatically, and auto-selected if no hero was selected yet.
 */
function applyStageClearHeroShards(
  currentHeroShards: Record<string, number>,
  currentOwnedHeroIds: string[],
  currentSelectedHeroId: string | null,
  stageIndex: number,
): StageClearHeroPatch {
  const reward = rollHeroShardReward(stageIndex);
  if (!reward) {
    return {
      heroShards: currentHeroShards,
      ownedHeroIds: currentOwnedHeroIds,
      selectedHeroId: currentSelectedHeroId,
      rewardMsg: '',
    };
  }
  const before = currentHeroShards[reward.heroId] ?? 0;
  const after = before + reward.amount;
  const heroShards = { ...currentHeroShards, [reward.heroId]: after };
  const wasOwned = currentOwnedHeroIds.includes(reward.heroId);
  const justUnlocked = !wasOwned && heroStarRank(after) >= 1;
  const ownedHeroIds = justUnlocked ? [...currentOwnedHeroIds, reward.heroId] : currentOwnedHeroIds;
  const selectedHeroId = justUnlocked && !currentSelectedHeroId ? reward.heroId : currentSelectedHeroId;
  const rewardMsg = justUnlocked
    ? ` ${reward.heroNameJP}のかけら+${reward.amount}（ヒーロー解放！）`
    : ` ${reward.heroNameJP}のかけら+${reward.amount}`;
  return { heroShards, ownedHeroIds, selectedHeroId, rewardMsg };
}

/**
 * Apply post-battle casualties:
 * - Remove destroyed player buildings from townGrid
 * - Hospitalize killed TownUnits (up to hospital capacity); excess die permanently
 * Returns the partial state update and a human-readable summary message.
 */
function applyBattleCasualties(params: {
  townGrid: TownGrid;
  townUnits: TownUnit[];
  hospitalWounded: WoundedUnit[];
  battleInitialBuildingIds: string[];
  survivingBuildings: Building[];
  killedTownUnitIds: string[];
}): {
  townGrid: TownGrid;
  townUnits: TownUnit[];
  hospitalWounded: WoundedUnit[];
  casualtyMsg: string;
} {
  const { townGrid, townUnits, hospitalWounded, battleInitialBuildingIds, survivingBuildings, killedTownUnitIds } = params;

  // 1. Destroyed buildings
  const survivingIds = new Set(survivingBuildings.map((b) => b.id));
  const destroyedSet = new Set(
    battleInitialBuildingIds.filter((id) => !survivingIds.has(id))
  );

  // Find the town hall before clearing, so we can restore it
  let townhallCell: TownGrid[0][0] = null;
  let townhallRow = -1;
  let townhallCol = -1;
  for (let r = 0; r < townGrid.length; r++) {
    for (let c = 0; c < townGrid[r].length; c++) {
      if (townGrid[r][c]?.type === 'townhall') {
        townhallCell = townGrid[r][c];
        townhallRow = r;
        townhallCol = c;
      }
    }
  }
  const townhallDestroyed = townhallCell !== null && destroyedSet.has(townhallCell.id);

  let newGrid: TownGrid = townGrid.map((row) =>
    row.map((cell) => (cell && destroyedSet.has(cell.id) ? null : cell))
  );

  // Restore town hall at original position with full HP if it was destroyed
  if (townhallDestroyed && townhallCell) {
    const restored = { ...townhallCell, hp: townhallCell.maxHp };
    newGrid = newGrid.map((row, r) =>
      row.map((cell, c) => (r === townhallRow && c === townhallCol ? restored : cell))
    );
  }

  // 2. Hospital capacity from updated grid
  let totalCapacity = 0;
  for (const row of newGrid) {
    for (const cell of row) {
      if (cell?.type === 'hospital') totalCapacity += hospitalCapacity(cell.level);
    }
  }
  const availableSlots = Math.max(0, totalCapacity - hospitalWounded.length);

  // 3. Process killed units
  const killedSet = new Set(killedTownUnitIds);
  const killedUnits = townUnits.filter((tu) => killedSet.has(tu.id));
  const newWounded: WoundedUnit[] = [...hospitalWounded];
  let woundedCount = 0;
  let deathCount = 0;

  killedUnits.forEach((tu, i) => {
    if (i < availableSlots) {
      const costs = healCost(tu.type);
      newWounded.push({ id: nanoid(), unitType: tu.type, unitLevel: tu.level, goldCost: costs.gold, foodCost: costs.food });
      woundedCount++;
    } else {
      deathCount++;
    }
  });

  const newTownUnits = townUnits.filter((tu) => !killedSet.has(tu.id));

  // 4. Build summary message
  const parts: string[] = [];
  const otherDestroyedCount = destroyedSet.size - (townhallDestroyed ? 1 : 0);
  if (townhallDestroyed) parts.push('本拠地が破壊されたが修復完了');
  if (otherDestroyedCount > 0) parts.push(`建物${otherDestroyedCount}棟破壊`);
  if (woundedCount > 0) parts.push(`${woundedCount}名入院`);
  if (deathCount > 0) parts.push(`${deathCount}名戦死`);
  const casualtyMsg = parts.length > 0 ? `（${parts.join('・')}）` : '';

  return { townGrid: newGrid, townUnits: newTownUnits, hospitalWounded: newWounded, casualtyMsg };
}

interface GameState {
  mode: GameMode;
  selectedTool: SelectedTool;
  townGrid: TownGrid;
  resources: Resources;
  townLevel: number;
  passiveTimer: number;
  message: string;
  messageTimer: number;
  /** Whether same-type/same-level buildings automatically merge each tick */
  autoMergeEnabled: boolean;

  townUnits: TownUnit[];
  selectedTownUnitId: string | null;
  /** ID of the barracks building currently open for recruiting / pending merge */
  selectedBarracksId: string | null;
  /** Whether the Town Hall upgrade panel is open */
  townhallPanelOpen: boolean;
  /** Whether the hospital panel is open */
  hospitalPanelOpen: boolean;
  /** Active Town Hall level-up progress, or null if not upgrading */
  townHallUpgrade: { timeRemaining: number; totalTime: number } | null;
  researchPanelOpen: boolean;
  researchedNodeIds: string[];
  activeResearchId: string | null;
  researchTimeRemaining: number | null;

  /** Units currently hospitalized (awaiting treatment) */
  hospitalWounded: WoundedUnit[];
  /** TownUnit IDs that died during the current battle (accumulated per tick) */
  killedTownUnitIds: string[];
  /** IDs of all player buildings at battle start (to detect which were destroyed) */
  battleInitialBuildingIds: string[];

  stageIndex: number;
  wave: number;
  waveTimer: number;
  battleBuildings: Building[];
  playerUnits: Unit[];
  enemyUnits: Unit[];
  projectiles: Projectile[];
  towerTimers: Record<string, number>;
  battleStrategy: BattleStrategy;
  strategyTimer: number;
  /** Active battle formation (陣形) — governs deployment shape and combat stat multipliers */
  formation: FormationType;
  battleSettingsOrigin: BattleSettingsOrigin;
  /** Hero catalog ownership is separate from definitions so a future unlock system can replace it. */
  ownedHeroIds: string[];
  /** Cumulative hero shards owned per hero ID. Star rank (☆1-5) is derived from this via heroStarRank(). */
  heroShards: Record<string, number>;
  selectedHeroId: string | null;
  /** The one hero currently deployed in battle, or null outside battle. */
  battleHero: BattleHero | null;

  goToMenu: () => void;
  startTown: () => void;
  goToStageSelect: () => void;
  goToBattleSettings: (origin?: BattleSettingsOrigin) => void;
  leaveBattleSettings: () => void;
  startBattle: (stageIdx: number) => void;
  returnToTown: () => void;
  setBattleStrategy: (s: BattleStrategy) => void;
  setFormation: (f: FormationType) => void;
  setSelectedHero: (heroId: string) => void;
  useHeroSkill: () => void;

  selectTool: (t: SelectedTool) => void;
  placeBuilding: (col: number, row: number) => void;
  /** Place a specific building type at an explicit cell (used when a cell was pre-selected with the 🖱️選択 tool). */
  placeBuildingAt: (type: BuildingType, col: number, row: number) => void;
  demolishBuilding: (col: number, row: number) => void;

  recruitUnit: (type: UnitType) => void;
  selectTownUnit: (id: string | null) => void;
  /** Click a barracks cell: selects it, or merges two same-level barracks */
  handleBarracksClick: (col: number, row: number) => void;
  closeBarracks: () => void;
  mergeUnits: (targetCol: number, targetRow: number) => void;
  dismissTownUnit: (id: string) => void;

  openTownhallPanel: () => void;
  closeTownhallPanel: () => void;
  startTownHallUpgrade: () => void;
  accelerateTownHallUpgrade: () => void;

  openHospitalPanel: () => void;
  closeHospitalPanel: () => void;
  openResearchPanel: () => void;
  closeResearchPanel: () => void;
  startResearch: (nodeId: string) => void;
  /** Pay treatment cost and return a hospitalized unit to the town grid */
  dischargeUnit: (woundedId: string) => void;
  /** Permanently dismiss a hospitalized unit (no cost, no return) */
  dismissWounded: (woundedId: string) => void;

  townTick: (dt: number) => void;
  battleTick: (dt: number) => void;
  showMessage: (msg: string, dur?: number) => void;
  saveGame: () => void;
  loadGame: () => boolean;
  hasSaveData: () => boolean;
  debugSetTownLevel: (level: number) => void;
  /** Developer cheat: fill all resources to current storage caps. */
  devMaxResources: () => void;
  autoPlaceBuilding: (tool: BuildingType) => void;
  triggerAutoMerge: () => void;
  toggleAutoMerge: () => void;
  /** Directly build an already-merged building at the given level, if resources allow (cost = base cost × 2^(level-1)). Returns true on success. */
  bulkBuildBuilding: (type: BuildingType, level: number, preferredCell?: { col: number; row: number } | null) => boolean;
}

export const BATTLE_COLS_EXPORT = BATTLE_COLS;
export const BATTLE_ROWS_EXPORT = BATTLE_ROWS;
export const BATTLE_CELL_EXPORT = BATTLE_CELL;

function buildAt(
  set: (partial: Partial<GameState>) => void,
  get: () => GameState,
  type: BuildingType,
  col: number,
  row: number,
) {
  const state = get();
  const cfg = BUILDING_CONFIGS[type];
  const maxHp = Math.round(
    cfg.maxHp *
    buildingLevelMultiplier(type, 1) *
    buildingHpResearchMultiplier(state.researchedNodeIds, type),
  );
  const building: Building = {
    id: nanoid(),
    type,
    gridX: col,
    gridZ: row,
    hp: maxHp,
    maxHp,
    faction: 'player',
    level: 1,
    productionTimer: 0,
  };
  const newGrid = state.townGrid.map((r, ri) =>
    r.map((c, ci) => (ri === row && ci === col ? building : c))
  );
  set({
    townGrid: newGrid,
    resources: {
      gold: state.resources.gold - cfg.cost.gold,
      wood: state.resources.wood - cfg.cost.wood,
      stone: state.resources.stone - cfg.cost.stone,
      food: state.resources.food - cfg.cost.food,
    },
    message: `${cfg.nameJP}を建設しました`,
    messageTimer: 2,
  });
}

export const useGameStore = create<GameState>((set, get) => ({
  mode: 'menu',
  selectedTool: 'select',
  townGrid: initGrid(),
  resources: { gold: 200, wood: 120, food: 80, stone: 80 },
  townLevel: 0,
  passiveTimer: 0,
  message: '',
  messageTimer: 0,
  autoMergeEnabled: true,

  townUnits: [],
  selectedTownUnitId: null,
  selectedBarracksId: null,
  townhallPanelOpen: false,
  hospitalPanelOpen: false,
  townHallUpgrade: null,
  researchPanelOpen: false,
  researchedNodeIds: [],
  activeResearchId: null,
  researchTimeRemaining: null,

  hospitalWounded: [],
  killedTownUnitIds: [],
  battleInitialBuildingIds: [],

  stageIndex: 0,
  wave: 0,
  waveTimer: 0,
  battleBuildings: [],
  playerUnits: [],
  enemyUnits: [],
  projectiles: [],
  towerTimers: {},
  battleStrategy: 'base_rush',
  strategyTimer: 0,
  formation: 'gyorin',
  battleSettingsOrigin: 'town',
  ownedHeroIds: [],
  heroShards: {},
  selectedHeroId: null,
  battleHero: null,

  showMessage: (msg, dur = 3) => set({ message: msg, messageTimer: dur }),

  goToMenu: () => set({ mode: 'menu' }),

  startTown: () =>
    set({
      mode: 'town',
      townGrid: initGrid(),
      resources: { gold: 200, wood: 120, food: 80, stone: 80 },
      townLevel: 0,
      selectedTool: 'select',
      townUnits: [],
      selectedTownUnitId: null,
      selectedBarracksId: null,
      townhallPanelOpen: false,
      hospitalPanelOpen: false,
      townHallUpgrade: null,
      researchPanelOpen: false,
      researchedNodeIds: [],
      activeResearchId: null,
      researchTimeRemaining: null,
      hospitalWounded: [],
      killedTownUnitIds: [],
      battleInitialBuildingIds: [],
      ownedHeroIds: [],
      heroShards: {},
      selectedHeroId: null,
      battleHero: null,
      message: '街を発展させよう！木材・石材を集めて本拠地をレベルアップ！',
      messageTimer: 4,
    }),

  goToStageSelect: () => set({ mode: 'stage_select' }),
  goToBattleSettings: (origin = 'town') => set({ mode: 'battle_settings', battleSettingsOrigin: origin }),
  leaveBattleSettings: () => {
    const origin = get().battleSettingsOrigin;
    set({ mode: origin });
  },

  setBattleStrategy: (s) => set({ battleStrategy: s }),
  setFormation: (f) => set({ formation: f }),
  setSelectedHero: (heroId) => {
    const state = get();
    if (state.ownedHeroIds.includes(heroId) && heroById(heroId)) {
      set({ selectedHeroId: heroId });
    }
  },
  useHeroSkill: () => {
    const state = get();
    if (state.mode !== 'battle' || !state.battleHero || state.battleHero.hp <= 0) return;
    if (state.battleHero.skillTimer > 0) {
      get().showMessage(`ヒーロースキルはあと${Math.ceil(state.battleHero.skillTimer)}秒で使用可能です`, 1.5);
      return;
    }
    set({ battleHero: { ...state.battleHero, skillRequested: true } });
  },

  startBattle: (stageIdx) => {
    const { townGrid, townUnits, formation, researchedNodeIds } = get();
    const bBuildings = makeBattleBuildings(townGrid, researchedNodeIds);
    const towerTimers: Record<string, number> = {};
    bBuildings.forEach((b) => {
      if (b.type === 'tower') towerTimers[b.id] = 0;
    });
    const playerUnits = townUnitsToPlayerUnits(townUnits, formation, researchedNodeIds);
    const battleHero = createBattleHero(get().selectedHeroId, townUnits, researchedNodeIds);
    const heroDefinition = heroById(get().selectedHeroId);
    // Snapshot all player building IDs so we can detect which were destroyed after battle
    const initialBuildingIds = gridToBuildings(townGrid).map((b) => b.id);
    set({
      mode: 'battle',
      stageIndex: stageIdx,
      wave: 0,
      waveTimer: 0,
      battleBuildings: bBuildings,
      playerUnits,
      battleHero,
      enemyUnits: [],
      projectiles: [],
      towerTimers,
      selectedTownUnitId: null,
      selectedBarracksId: null,
      killedTownUnitIds: [],
      battleInitialBuildingIds: initialBuildingIds,
      message: heroDefinition
        ? `ステージ ${STAGE_NAMES[stageIdx]} 開始！${heroDefinition.emoji} ${heroDefinition.nameJP}と兵士${playerUnits.length}名で戦え！`
        : `ステージ ${STAGE_NAMES[stageIdx]} 開始！兵士${playerUnits.length}名で戦え！`,
      messageTimer: 4,
    });
  },

  returnToTown: () => {
    set({
      mode: 'town',
      selectedTownUnitId: null,
      selectedBarracksId: null,
      battleHero: null,
      playerUnits: [],
      enemyUnits: [],
      battleBuildings: [],
      projectiles: [],
      message: '街に戻りました',
      messageTimer: 3,
    });
    setTimeout(() => get().saveGame(), 100);
  },

  selectTool: (t) =>
    set({
      selectedTool: t,
      selectedTownUnitId: null,
      selectedBarracksId: null,
      townhallPanelOpen: false,
      researchPanelOpen: false,
    }),

  placeBuilding: (col, row) => {
    const state = get();
    if (state.mode !== 'town') return;
    const tool = state.selectedTool;
    if (tool === 'select' || tool === 'demolish') return;

    if (!isCellUnlocked(col, row, state.townLevel)) {
      get().showMessage('この土地はまだ解放されていません！街レベルを上げよう！');
      return;
    }

    const cfg = BUILDING_CONFIGS[tool];
    if (!cfg) return;
    if (cfg.unlockLevel > state.townLevel) {
      get().showMessage('この建物はまだ解放されていません！');
      return;
    }
    if (
      state.resources.gold < cfg.cost.gold ||
      state.resources.wood < cfg.cost.wood ||
      state.resources.stone < cfg.cost.stone ||
      state.resources.food < cfg.cost.food
    ) {
      get().showMessage('リソースが足りません！');
      return;
    }
    if (state.townGrid[row]?.[col]) {
      get().showMessage('すでに建物があります！');
      return;
    }
    if (state.townUnits.some((u) => u.gridX === col && u.gridZ === row)) {
      get().showMessage('兵士がいます！先に移動させてください。');
      return;
    }
    buildAt(set, get, tool, col, row);
  },

  demolishBuilding: (col, row) => {
    const state = get();
    if (state.mode !== 'town') return;
    const cell = state.townGrid[row]?.[col];
    if (!cell || cell.type === 'townhall') return;
    const cfg = BUILDING_CONFIGS[cell.type];
    const newGrid = state.townGrid.map((r, ri) =>
      r.map((c, ci) => (ri === row && ci === col ? null : c))
    );
    set({
      townGrid: newGrid,
      resources: {
        gold: state.resources.gold + Math.floor(cfg.cost.gold * 0.5),
        wood: state.resources.wood + Math.floor(cfg.cost.wood * 0.5),
        stone: state.resources.stone + Math.floor(cfg.cost.stone * 0.5),
        food: state.resources.food,
      },
      selectedBarracksId: null,
      message: `${cfg.nameJP}を解体（資源の50%回収）`,
      messageTimer: 2,
    });
  },

  openTownhallPanel: () =>
    set({ townhallPanelOpen: true, selectedBarracksId: null, selectedTownUnitId: null }),

  closeTownhallPanel: () => set({ townhallPanelOpen: false }),

  startTownHallUpgrade: () => {
    const state = get();
    if (state.mode !== 'town') return;
    if (state.townHallUpgrade) {
      get().showMessage('本拠地は既にレベルアップ中です！');
      return;
    }
    if (state.townLevel >= MAX_TOWN_LEVEL) {
      get().showMessage('本拠地は既に最大レベルです！');
      return;
    }
    const cost = townHallUpgradeCost(state.townLevel);
    if (state.resources.wood < cost.wood || state.resources.stone < cost.stone) {
      get().showMessage(`木材・石材が足りません！（必要: 🪵${cost.wood} 🪨${cost.stone}）`);
      return;
    }
    set({
      resources: {
        ...state.resources,
        wood: state.resources.wood - cost.wood,
        stone: state.resources.stone - cost.stone,
      },
      townHallUpgrade: { timeRemaining: cost.timeSec, totalTime: cost.timeSec },
      message: `🏗️ 本拠地のレベルアップを開始！（${cost.timeSec}秒）`,
      messageTimer: 3,
    });
  },

  accelerateTownHallUpgrade: () => {
    const state = get();
    const goldCost = 10;
    const secondsPerPurchase = 60;
    if (state.mode !== 'town' || !state.townHallUpgrade) return;
    if (state.resources.gold < goldCost) {
      get().showMessage('加速に必要なゴールドが足りません！（🪙10）');
      return;
    }

    const nextRemaining = Math.max(0, state.townHallUpgrade.timeRemaining - secondsPerPurchase);
    const nextTownLevel = Math.min(MAX_TOWN_LEVEL, state.townLevel + 1);
    if (nextRemaining <= 0) {
      set({
        resources: { ...state.resources, gold: state.resources.gold - goldCost },
        townHallUpgrade: null,
        townLevel: nextTownLevel,
        message: `⚡ ゴールド10で建築を1分短縮！本拠地がLv.${nextTownLevel + 1}になりました！`,
        messageTimer: 4,
      });
    } else {
      set({
        resources: { ...state.resources, gold: state.resources.gold - goldCost },
        townHallUpgrade: { ...state.townHallUpgrade, timeRemaining: nextRemaining },
        message: '⚡ ゴールド10で建築時間を1分短縮しました！',
        messageTimer: 3,
      });
    }
    setTimeout(() => get().saveGame(), 100);
  },

  handleBarracksClick: (col, row) => {
    const state = get();
    const building = state.townGrid[row]?.[col];
    if (!building || !isBarracksType(building.type)) return;

    // Deselect if clicking the already-selected barracks
    if (state.selectedBarracksId === building.id) {
      set({ selectedBarracksId: null });
      return;
    }

    // If another barracks is selected, try to merge them
    if (state.selectedBarracksId) {
      let srcBuilding: Building | null = null;
      let srcRow = -1, srcCol = -1;
      outer: for (let r = 0; r < TOWN_ROWS; r++) {
        for (let c = 0; c < TOWN_COLS; c++) {
          const cell = state.townGrid[r]?.[c];
          if (cell?.id === state.selectedBarracksId) {
            srcBuilding = cell;
            srcRow = r;
            srcCol = c;
            break outer;
          }
        }
      }

      // Merge only same type + same level
      if (
        srcBuilding &&
        isBarracksType(srcBuilding.type) &&
        srcBuilding.type === building.type &&
        srcBuilding.level === building.level
      ) {
        const newLevel = building.level + 1;
        const maxBLevel = maxBuildingLevelForTown(state.townLevel);
        if (newLevel > maxBLevel) {
          get().showMessage(`街 Lv.${newLevel} 以上で Lv.${newLevel} に合成できます！`);
          set({ selectedBarracksId: null });
          return;
        }

        const cfg = BUILDING_CONFIGS[building.type] ?? BUILDING_CONFIGS.barracks;
        const maxHp = Math.round(
          buildingHpResearchMultiplier(state.researchedNodeIds, building.type) *
          cfg.maxHp *
          buildingLevelMultiplier(building.type, newLevel),
        );
        const mergedBarracks: Building = {
          ...building,
          id: nanoid(),
          level: newLevel,
          hp: maxHp,
          maxHp,
        };

        const newGrid = state.townGrid.map((r, ri) =>
          r.map((cell, ci) => {
            if (ri === srcRow && ci === srcCol) return null;
            if (ri === row && ci === col) return mergedBarracks;
            return cell;
          })
        );

        const prevTier = unlockedTierForBarracksLevel(building.level);
        const newTier = unlockedTierForBarracksLevel(newLevel);
        let message = `⬆️ ${cfg.nameJP} Lv.${newLevel} に合成！`;
        if (newTier > prevTier) {
          const newUnitNames = (UNITS_BY_TIER[newTier] ?? [])
            .map((u) => UNIT_CONFIGS[u].nameJP)
            .join('/');
          message += ` Tier ${newTier} 解放！（${newUnitNames}）`;
        }

        set({ townGrid: newGrid, selectedBarracksId: mergedBarracks.id, message, messageTimer: 4 });
        return;
      }
    }

    // Select this barracks (open recruit panel)
    set({ selectedBarracksId: building.id, selectedTownUnitId: null });
  },

  closeBarracks: () => set({ selectedBarracksId: null }),

  openHospitalPanel: () => set({ hospitalPanelOpen: true, selectedBarracksId: null, townhallPanelOpen: false, selectedTownUnitId: null }),
  closeHospitalPanel: () => set({ hospitalPanelOpen: false }),
  openResearchPanel: () => set({ researchPanelOpen: true, selectedBarracksId: null, townhallPanelOpen: false, hospitalPanelOpen: false, selectedTownUnitId: null }),
  closeResearchPanel: () => set({ researchPanelOpen: false }),

  startResearch: (nodeId) => {
    const state = get();
    const node = researchNodeById(nodeId);
    if (state.mode !== 'town' || !node) return;
    if (!state.townGrid.flat().some((building) => building?.type === 'research_lab')) {
      get().showMessage('研究所を建設してください！');
      return;
    }
    if (state.researchedNodeIds.includes(node.id)) {
      get().showMessage('この研究は既に完了しています');
      return;
    }
    if (state.activeResearchId) {
      get().showMessage('研究は同時に1件までです。現在の研究の完了を待ってください');
      return;
    }
    if (node.prerequisiteId && !state.researchedNodeIds.includes(node.prerequisiteId)) {
      get().showMessage('前提研究が完了していません');
      return;
    }
    if (
      state.resources.gold < node.cost.gold ||
      state.resources.wood < node.cost.wood ||
      state.resources.stone < node.cost.stone ||
      state.resources.food < node.cost.food
    ) {
      get().showMessage('研究に必要な資源が足りません！');
      return;
    }
    set({
      resources: {
        gold: state.resources.gold - node.cost.gold,
        wood: state.resources.wood - node.cost.wood,
        stone: state.resources.stone - node.cost.stone,
        food: state.resources.food - node.cost.food,
      },
      activeResearchId: node.id,
      researchTimeRemaining: node.durationSec,
      researchPanelOpen: true,
      message: `研究開始：${node.name}`,
      messageTimer: 3,
    });
  },

  dischargeUnit: (woundedId) => {
    const state = get();
    const wounded = state.hospitalWounded.find((w) => w.id === woundedId);
    if (!wounded) return;
    if (state.resources.gold < wounded.goldCost || state.resources.food < wounded.foodCost) {
      get().showMessage('治療費が足りません！');
      return;
    }
    // Find an empty unlocked cell
    const unlockCols = UNLOCK_COLS_BY_LEVEL[Math.min(state.townLevel, UNLOCK_COLS_BY_LEVEL.length - 1)];
    let placed = false;
    for (let r = 0; r < TOWN_ROWS && !placed; r++) {
      for (let c = 0; c < unlockCols && !placed; c++) {
        if (state.townGrid[r]?.[c]) continue;
        if (state.townUnits.some((u) => u.gridX === c && u.gridZ === r)) continue;
        const newUnit: TownUnit = { id: nanoid(), type: wounded.unitType, level: wounded.unitLevel, gridX: c, gridZ: r };
        set({
          townUnits: [...state.townUnits, newUnit],
          hospitalWounded: state.hospitalWounded.filter((w) => w.id !== woundedId),
          resources: { ...state.resources, gold: state.resources.gold - wounded.goldCost, food: state.resources.food - wounded.foodCost },
          message: `${UNIT_CONFIGS[wounded.unitType].nameJP}が回復して復帰！`,
          messageTimer: 3,
        });
        placed = true;
      }
    }
    if (!placed) get().showMessage('空きマスがありません！');
  },

  dismissWounded: (woundedId) => {
    const state = get();
    const wounded = state.hospitalWounded.find((w) => w.id === woundedId);
    if (!wounded) return;
    set({
      hospitalWounded: state.hospitalWounded.filter((w) => w.id !== woundedId),
      message: `${UNIT_CONFIGS[wounded.unitType].nameJP}を解放しました`,
      messageTimer: 2,
    });
  },

  recruitUnit: (type) => {
    const state = get();
    if (state.mode !== 'town') return;

    if (!state.selectedBarracksId) {
      get().showMessage('兵舎を選択してください！');
      return;
    }

    // Find the selected barracks building
    let barracks: Building | null = null;
    outer: for (let r = 0; r < TOWN_ROWS; r++) {
      for (let c = 0; c < TOWN_COLS; c++) {
        if (state.townGrid[r]?.[c]?.id === state.selectedBarracksId) {
          barracks = state.townGrid[r]![c];
          break outer;
        }
      }
    }

    if (!barracks) {
      get().showMessage('訓練所が見つかりません！');
      return;
    }

    const cfg = UNIT_CONFIGS[type];
    const requiredLevel = barracksLevelForTier(cfg.barracksTier);
    if (barracks.level < requiredLevel) {
      const facilityName = BUILDING_CONFIGS[barracks.type]?.nameJP ?? '訓練所';
      get().showMessage(`この兵種には${facilityName} Lv.${requiredLevel} が必要です！`);
      return;
    }

    // Ensure the unit archetype matches this facility
    const allowedUnits = unitsForBarracksType(barracks.type, barracks.level);
    if (!allowedUnits.includes(type)) {
      get().showMessage('この訓練所では育成できない兵種です！');
      return;
    }

    if (
      state.resources.gold < cfg.cost.gold ||
      state.resources.food < cfg.cost.food
    ) {
      get().showMessage('リソースが足りません！');
      return;
    }

    const unlockCols = UNLOCK_COLS_BY_LEVEL[Math.min(state.townLevel, UNLOCK_COLS_BY_LEVEL.length - 1)];
    const emptyCells: { col: number; row: number }[] = [];
    for (let row = 0; row < TOWN_ROWS; row++) {
      for (let col = 0; col < unlockCols; col++) {
        const hasBuilding = !!state.townGrid[row]?.[col];
        const hasUnit = state.townUnits.some((u) => u.gridX === col && u.gridZ === row);
        if (!hasBuilding && !hasUnit) {
          emptyCells.push({ col, row });
        }
      }
    }

    if (emptyCells.length === 0) {
      get().showMessage('空きスペースがありません！建物や兵士が多すぎます。');
      return;
    }

    const cell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const newUnit: TownUnit = {
      id: nanoid(),
      type,
      level: 1,
      gridX: cell.col,
      gridZ: cell.row,
    };

    set((s) => ({
      townUnits: [...s.townUnits, newUnit],
      resources: {
        ...s.resources,
        gold: s.resources.gold - cfg.cost.gold,
        food: s.resources.food - cfg.cost.food,
      },
      message: `${cfg.nameJP} Lv.1 を召喚！`,
      messageTimer: 2,
    }));
  },

  selectTownUnit: (id) => {
    set({ selectedTownUnitId: id, selectedBarracksId: null });
  },

  mergeUnits: (targetCol, targetRow) => {
    const state = get();
    if (!state.selectedTownUnitId) return;

    const selectedUnit = state.townUnits.find((u) => u.id === state.selectedTownUnitId);
    if (!selectedUnit) {
      set({ selectedTownUnitId: null });
      return;
    }

    const targetUnit = state.townUnits.find(
      (u) => u.gridX === targetCol && u.gridZ === targetRow
    );

    if (!targetUnit || targetUnit.id === selectedUnit.id) {
      // Move to empty cell
      const hasBuilding = !!state.townGrid[targetRow]?.[targetCol];
      const otherUnit = state.townUnits.find(
        (u) => u.gridX === targetCol && u.gridZ === targetRow && u.id !== selectedUnit.id
      );
      if (!hasBuilding && !otherUnit && isCellUnlocked(targetCol, targetRow, state.townLevel)) {
        set((s) => ({
          townUnits: s.townUnits.map((u) =>
            u.id === selectedUnit.id ? { ...u, gridX: targetCol, gridZ: targetRow } : u
          ),
          selectedTownUnitId: null,
        }));
      } else {
        set({ selectedTownUnitId: null });
      }
      return;
    }

    if (targetUnit.type !== selectedUnit.type || targetUnit.level !== selectedUnit.level) {
      get().showMessage('同じ種類・レベルの兵士同士のみ合成できます！');
      set({ selectedTownUnitId: null });
      return;
    }

    const newLevel = selectedUnit.level + 1;
    const maxLevel = maxUnitLevelForTown(state.townLevel);
    if (newLevel > maxLevel) {
      get().showMessage(
        `街レベルが足りません（現在最大 Lv${maxLevel}）`
      );
      set({ selectedTownUnitId: null });
      return;
    }

    const mergedUnit: TownUnit = {
      id: nanoid(),
      type: selectedUnit.type,
      level: newLevel,
      gridX: targetCol,
      gridZ: targetRow,
    };

    set((s) => ({
      townUnits: s.townUnits
        .filter((u) => u.id !== selectedUnit.id && u.id !== targetUnit.id)
        .concat(mergedUnit),
      selectedTownUnitId: null,
      message: `⬆️ ${UNIT_CONFIGS[selectedUnit.type].nameJP} が Lv.${newLevel} に強化！`,
      messageTimer: 2,
    }));
  },

  dismissTownUnit: (id) => {
    const state = get();
    const unit = state.townUnits.find((u) => u.id === id);
    if (!unit) return;
    set((s) => ({
      townUnits: s.townUnits.filter((u) => u.id !== id),
      selectedTownUnitId: null,
      message: `${UNIT_CONFIGS[unit.type].nameJP} を解散しました`,
      messageTimer: 2,
    }));
  },

  townTick: (dt) => {
    const state = get();
    if (state.mode !== 'town') return;
    let msgTimer = Math.max(0, state.messageTimer - dt);

    // Town Hall upgrade progress (ticks every frame, independent of the 1s resource tick)
    let townLevel = state.townLevel;
    let townHallUpgrade = state.townHallUpgrade;
    let upgradeMsg: string | null = null;
    let researchedNodeIds = state.researchedNodeIds;
    let activeResearchId = state.activeResearchId;
    let researchTimeRemaining = state.researchTimeRemaining;
    let researchMsg: string | null = null;
    if (activeResearchId && researchTimeRemaining !== null) {
      const activeResearch = researchNodeById(activeResearchId);
      if (!activeResearch) {
        activeResearchId = null;
        researchTimeRemaining = null;
      } else {
        researchTimeRemaining -= dt;
        if (researchTimeRemaining <= 0) {
          researchedNodeIds = [...researchedNodeIds, activeResearch.id];
          activeResearchId = null;
          researchTimeRemaining = null;
          researchMsg = `研究完了：${activeResearch.name}`;
          msgTimer = 4;
        }
      }
    }
    if (townHallUpgrade) {
      const remaining = townHallUpgrade.timeRemaining - dt;
      if (remaining <= 0) {
        townLevel = Math.min(MAX_TOWN_LEVEL, townLevel + 1);
        townHallUpgrade = null;
        upgradeMsg = `🎉 本拠地がLv.${townLevel + 1}になった！新しい土地・建物が解放！`;
        msgTimer = 4;
      } else {
        townHallUpgrade = { ...townHallUpgrade, timeRemaining: remaining };
      }
    }

    const msgExpired = msgTimer <= 0 && state.messageTimer > 0;

    const newTimer = state.passiveTimer + dt;
    if (newTimer < 1) {
      set({
        passiveTimer: newTimer,
        messageTimer: msgTimer,
        townLevel,
        townHallUpgrade,
        researchedNodeIds,
        activeResearchId,
        researchTimeRemaining,
        ...(researchMsg ? { message: researchMsg } : {}),
        ...(upgradeMsg ? { message: upgradeMsg } : msgExpired ? { message: '' } : {}),
      });
      return;
    }
    let gold = state.resources.gold;
    let food = state.resources.food;
    let wood = state.resources.wood;
    let stone = state.resources.stone;
    const productionMultiplier = resourceProductionResearchMultiplier(researchedNodeIds);
    for (const row of state.townGrid) {
      for (const cell of row) {
        if (!cell) continue;
        const levelMultiplier = buildingLevelMultiplier(cell.type, cell.level);
        if (cell.type === 'house') gold += HOUSE_GOLD_PER_SEC * levelMultiplier * productionMultiplier;
        if (cell.type === 'mine') gold += MINE_GOLD_PER_SEC * levelMultiplier * productionMultiplier;
        if (cell.type === 'farm') food += FARM_FOOD_PER_SEC * levelMultiplier * productionMultiplier;
        if (cell.type === 'lumbermill') wood += LUMBERMILL_WOOD_PER_SEC * levelMultiplier * productionMultiplier;
        if (cell.type === 'quarry') stone += QUARRY_STONE_PER_SEC * levelMultiplier * productionMultiplier;
      }
    }
    const caps = resourceCapsForLevel(townLevel);
    set({
      resources: {
        gold: Math.min(gold, caps.gold),
        food: Math.min(food, caps.food),
        wood: Math.min(wood, caps.wood),
        stone: Math.min(stone, caps.stone),
      },
      passiveTimer: 0,
      messageTimer: msgTimer,
      townLevel,
      townHallUpgrade,
      researchedNodeIds,
      activeResearchId,
      researchTimeRemaining,
      ...(researchMsg || upgradeMsg
        ? { message: researchMsg ?? upgradeMsg! }
        : msgExpired ? { message: '' } : {}),
    });
    // Auto-merge check every tick
    if (get().autoMergeEnabled) get().triggerAutoMerge();
  },

  saveGame: () => {
    const state = get();
    const saveData = {
      version: 9,
      savedAt: Date.now(),
      townGrid: state.townGrid,
      resources: state.resources,
      townLevel: state.townLevel,
      stageIndex: state.stageIndex,
      townUnits: state.townUnits,
      townHallUpgrade: state.townHallUpgrade,
      hospitalWounded: state.hospitalWounded,
      ownedHeroIds: state.ownedHeroIds,
      heroShards: state.heroShards,
      selectedHeroId: state.selectedHeroId,
      researchedNodeIds: state.researchedNodeIds,
      activeResearchId: state.activeResearchId,
      researchTimeRemaining: state.researchTimeRemaining,
    };
    try {
      localStorage.setItem('citywars_save', JSON.stringify(saveData));
      set({ message: '💾 セーブしました！', messageTimer: 2 });
    } catch {
      set({ message: 'セーブに失敗しました', messageTimer: 2 });
    }
  },

  loadGame: (): boolean => {
    try {
      const raw = localStorage.getItem('citywars_save');
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data?.version) return false;
      const validHeroIds = new Set(HERO_DEFINITIONS.map((hero) => hero.id));
      const validResearchIds = new Set(RESEARCH_DEFINITIONS.map((node) => node.id));
      const savedOwnedHeroIds = Array.isArray(data.ownedHeroIds)
        ? data.ownedHeroIds.filter((id: unknown): id is string => typeof id === 'string' && validHeroIds.has(id))
        : [];
      // Version 6 and earlier granted the whole catalog as starter heroes.
      // Treat those saves as unowned so the future acquisition system starts cleanly.
      const safeOwnedHeroIds = data.version >= 7 ? savedOwnedHeroIds : [];
      const rawHeroShards = data.version >= 9 && data.heroShards && typeof data.heroShards === 'object'
        ? data.heroShards
        : {};
      const heroShards: Record<string, number> = {};
      for (const heroId of Object.keys(rawHeroShards)) {
        if (!validHeroIds.has(heroId)) continue;
        const value = rawHeroShards[heroId];
        if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
          heroShards[heroId] = Math.floor(value);
        }
      }
      // A hero can be owned (from an older save) without shard data; keep it selectable
      // at ☆1 worth of shards so its star rank doesn't regress below "unlocked".
      for (const heroId of safeOwnedHeroIds) {
        if (!(heroId in heroShards)) heroShards[heroId] = 5;
      }
      const selectedHeroId = typeof data.selectedHeroId === 'string' && safeOwnedHeroIds.includes(data.selectedHeroId)
        ? data.selectedHeroId
        : null;
      const researchedNodeIds = Array.isArray(data.researchedNodeIds)
        ? data.researchedNodeIds.filter((id: unknown): id is string => typeof id === 'string' && validResearchIds.has(id))
        : [];
      const activeResearchId = typeof data.activeResearchId === 'string' &&
        validResearchIds.has(data.activeResearchId) &&
        !researchedNodeIds.includes(data.activeResearchId)
        ? data.activeResearchId
        : null;
      const activeResearch = researchNodeById(activeResearchId);
      const researchTimeRemaining = activeResearchId && activeResearch && typeof data.researchTimeRemaining === 'number'
        ? Math.max(0, Math.min(activeResearch.durationSec, data.researchTimeRemaining))
        : null;
      const loadedTownLevel = Math.max(
        0,
        Math.min(MAX_TOWN_LEVEL, Number.isFinite(data.townLevel) ? Math.floor(data.townLevel) : 0),
      );
      const loadedMaxBuildingLevel = maxBuildingLevelForTown(loadedTownLevel);
      const rawTownGrid = Array.isArray(data.townGrid) ? data.townGrid : [];
      const loadedTownGrid: TownGrid = Array.from({ length: TOWN_ROWS }, (_, row) =>
        Array.from({ length: TOWN_COLS }, (_, col) => {
          const cell = rawTownGrid[row]?.[col];
          if (!cell || typeof cell !== 'object') return null;
          const cfg = BUILDING_CONFIGS[cell.type as BuildingType];
          if (!cfg) return null;
          const level = Math.max(
            1,
            Math.min(
              loadedMaxBuildingLevel,
              Number.isFinite(cell.level) ? Math.floor(cell.level) : 1,
            ),
          );
          const savedMaxHp = typeof cell.maxHp === 'number' && cell.maxHp > 0 ? cell.maxHp : cfg.maxHp;
          const savedHp = typeof cell.hp === 'number' ? Math.max(0, cell.hp) : savedMaxHp;
          const maxHp = Math.round(
            cfg.maxHp *
            buildingLevelMultiplier(cell.type as BuildingType, level) *
            buildingHpResearchMultiplier(researchedNodeIds, cell.type as BuildingType),
          );
          const hpRatio = Math.min(1, savedHp / savedMaxHp);
          return {
            ...cell,
            level,
            hp: Math.min(maxHp, Math.round(maxHp * hpRatio)),
            maxHp,
          } as Building;
        }),
      );
      set({
        mode: 'town',
        townGrid: loadedTownGrid,
        resources: {
          gold: data.resources?.gold ?? 200,
          wood: data.resources?.wood ?? 120,
          food: data.resources?.food ?? 80,
          stone: data.resources?.stone ?? 80,
        },
        townLevel: loadedTownLevel,
        stageIndex: data.stageIndex ?? 0,
        townUnits: data.townUnits ?? [],
        townHallUpgrade: data.townHallUpgrade ?? null,
        hospitalWounded: data.hospitalWounded ?? [],
        ownedHeroIds: safeOwnedHeroIds,
        heroShards,
        selectedHeroId,
        researchPanelOpen: false,
        researchedNodeIds,
        activeResearchId,
        researchTimeRemaining,
        battleHero: null,
        townhallPanelOpen: false,
        hospitalPanelOpen: false,
        playerUnits: [],
        enemyUnits: [],
        projectiles: [],
        battleBuildings: [],
        wave: 0,
        waveTimer: 0,
        killedTownUnitIds: [],
        battleInitialBuildingIds: [],
        selectedTownUnitId: null,
        selectedBarracksId: null,
        message: '📂 セーブデータをロードしました！',
        messageTimer: 3,
      });
      return true;
    } catch {
      return false;
    }
  },

  hasSaveData: (): boolean => {
    return !!localStorage.getItem('citywars_save');
  },

  debugSetTownLevel: (level: number) => {
    const clamped = Math.max(0, Math.min(level, MAX_TOWN_LEVEL));
    const caps = resourceCapsForLevel(clamped);
    set({
      townLevel: clamped,
      mode: 'town',
      resources: { gold: caps.gold, wood: caps.wood, stone: caps.stone, food: caps.food },
    });
    setTimeout(() => get().saveGame(), 50);
  },

  devMaxResources: () => {
    if (!import.meta.env.DEV) return;
    const state = get();
    if (state.mode !== 'town') return;
    const caps = resourceCapsForLevel(state.townLevel);
    set({
      resources: { gold: caps.gold, wood: caps.wood, stone: caps.stone, food: caps.food },
      message: '🛠️ 開発者用ボタン：資源をMAXにしました',
      messageTimer: 3,
    });
    setTimeout(() => get().saveGame(), 50);
  },

  autoPlaceBuilding: (tool: BuildingType) => {
    const state = get();
    if (state.mode !== 'town') return;
    const cfg = BUILDING_CONFIGS[tool];
    if (!cfg) return;
    if (cfg.unlockLevel > state.townLevel) {
      get().showMessage('この建物はまだ解放されていません！');
      return;
    }
    // Find first empty unlocked cell
    let targetCol = -1, targetRow = -1;
    outer: for (let row = 0; row < TOWN_ROWS; row++) {
      for (let col = 0; col < TOWN_COLS; col++) {
        if (!isCellUnlocked(col, row, state.townLevel)) continue;
        if (state.townGrid[row]?.[col]) continue;
        if (state.townUnits.some((u) => u.gridX === col && u.gridZ === row)) continue;
        targetCol = col;
        targetRow = row;
        break outer;
      }
    }
    if (targetCol === -1) {
      get().showMessage('空きマスがありません！');
      return;
    }
    buildAt(set, get, tool, targetCol, targetRow);
  },

  placeBuildingAt: (type: BuildingType, col: number, row: number) => {
    const state = get();
    if (state.mode !== 'town') return;
    const cfg = BUILDING_CONFIGS[type];
    if (!cfg) return;
    if (!isCellUnlocked(col, row, state.townLevel)) {
      get().showMessage('この土地はまだ解放されていません！街レベルを上げよう！');
      return;
    }
    if (cfg.unlockLevel > state.townLevel) {
      get().showMessage('この建物はまだ解放されていません！');
      return;
    }
    if (
      state.resources.gold < cfg.cost.gold ||
      state.resources.wood < cfg.cost.wood ||
      state.resources.stone < cfg.cost.stone ||
      state.resources.food < cfg.cost.food
    ) {
      get().showMessage('リソースが足りません！');
      return;
    }
    if (state.townGrid[row]?.[col]) {
      get().showMessage('すでに建物があります！');
      return;
    }
    if (state.townUnits.some((u) => u.gridX === col && u.gridZ === row)) {
      get().showMessage('兵士がいます！先に移動させてください。');
      return;
    }
    buildAt(set, get, type, col, row);
  },

  bulkBuildBuilding: (type: BuildingType, level: number, preferredCell?: { col: number; row: number } | null) => {
    const state = get();
    if (state.mode !== 'town') return false;
    const cfg = BUILDING_CONFIGS[type];
    if (!cfg || type === 'townhall') return false;
    if (cfg.unlockLevel > state.townLevel) {
      get().showMessage('この建物はまだ解放されていません！');
      return false;
    }
    const maxLevel = maxBuildingLevelForTown(state.townLevel);
    const lvl = Number.isFinite(level) ? Math.min(maxLevel, Math.max(1, Math.floor(level))) : 1;
    if (lvl > maxLevel) {
      get().showMessage(`街 Lv.${lvl} 以上でこのレベルを一括建築できます！（現在の上限 Lv.${maxLevel}）`);
      return false;
    }
    const mult = Math.pow(2, lvl - 1);
    const cost = {
      gold: Math.round(cfg.cost.gold * mult),
      wood: Math.round(cfg.cost.wood * mult),
      stone: Math.round(cfg.cost.stone * mult),
      food: Math.round(cfg.cost.food * mult),
    };
    if (
      state.resources.gold < cost.gold ||
      state.resources.wood < cost.wood ||
      state.resources.stone < cost.stone ||
      state.resources.food < cost.food
    ) {
      get().showMessage(
        `リソースが足りません！（必要: 🪙${cost.gold} 🪵${cost.wood} 🪨${cost.stone} 🌾${cost.food}）`
      );
      return false;
    }
    // If a cell is currently selected and it's a valid build spot, build there.
    // Otherwise fall back to the first empty unlocked cell.
    let targetCol = -1, targetRow = -1;
    if (
      preferredCell &&
      isCellUnlocked(preferredCell.col, preferredCell.row, state.townLevel) &&
      !state.townGrid[preferredCell.row]?.[preferredCell.col] &&
      !state.townUnits.some((u) => u.gridX === preferredCell.col && u.gridZ === preferredCell.row)
    ) {
      targetCol = preferredCell.col;
      targetRow = preferredCell.row;
    } else {
      outer: for (let row = 0; row < TOWN_ROWS; row++) {
        for (let col = 0; col < TOWN_COLS; col++) {
          if (!isCellUnlocked(col, row, state.townLevel)) continue;
          if (state.townGrid[row]?.[col]) continue;
          if (state.townUnits.some((u) => u.gridX === col && u.gridZ === row)) continue;
          targetCol = col;
          targetRow = row;
          break outer;
        }
      }
    }
    if (targetCol === -1) {
      get().showMessage('空きマスがありません！');
      return false;
    }
    const building: Building = {
      id: nanoid(),
      type,
      gridX: targetCol,
      gridZ: targetRow,
      hp: Math.round(
        cfg.maxHp *
        buildingLevelMultiplier(type, lvl) *
        buildingHpResearchMultiplier(state.researchedNodeIds, type),
      ),
      maxHp: Math.round(
        cfg.maxHp *
        buildingLevelMultiplier(type, lvl) *
        buildingHpResearchMultiplier(state.researchedNodeIds, type),
      ),
      faction: 'player',
      level: lvl,
      productionTimer: 0,
    };
    const newGrid = state.townGrid.map((r, ri) =>
      r.map((c, ci) => (ri === targetRow && ci === targetCol ? building : c))
    );
    set({
      townGrid: newGrid,
      resources: {
        gold: state.resources.gold - cost.gold,
        wood: state.resources.wood - cost.wood,
        stone: state.resources.stone - cost.stone,
        food: state.resources.food - cost.food,
      },
      message: `🏗️ ${cfg.nameJP} Lv.${lvl} を一括建築しました！`,
      messageTimer: 3,
    });
    return true;
  },

  toggleAutoMerge: () => {
    const enabled = !get().autoMergeEnabled;
    set({
      autoMergeEnabled: enabled,
      message: enabled ? '🔗 自動合成をONにしました' : '⛔ 自動合成をOFFにしました',
      messageTimer: 2,
    });
  },

  triggerAutoMerge: () => {
    const state = get();
    if (state.mode !== 'town') return;

    // Deep-copy the grid so we can mutate it
    let grid = state.townGrid.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
    let totalMerged = 0;
    let mergeMessages: string[] = [];

    // Keep looping until no more merges are possible (handles cascades)
    let changed = true;
    while (changed) {
      changed = false;

      // Collect positions grouped by (type, level)
      const groups = new Map<string, Array<{ row: number; col: number }>>();
      for (let row = 0; row < TOWN_ROWS; row++) {
        for (let col = 0; col < TOWN_COLS; col++) {
          const cell = grid[row]?.[col];
          if (!cell || cell.type === 'townhall') continue;
          const key = `${cell.type}:${cell.level}`;
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push({ row, col });
        }
      }

      for (const [key, positions] of groups) {
        // Merge every 2 same-type/same-level buildings into 1 of the next level
        const pairs = Math.floor(positions.length / 2);
        if (pairs < 1) continue;
        const currentLevel = grid[positions[0].row]?.[positions[0].col]?.level ?? 1;
        if (currentLevel >= maxBuildingLevelForTown(state.townLevel)) continue;
        changed = true;

        const mergeCount = pairs * 2;
        const batch = positions.slice(0, mergeCount);
        // First half → upgrade to level+1
        for (let i = 0; i < pairs; i++) {
          const { row, col } = batch[i];
          const cell = grid[row]?.[col];
          if (cell) {
            const nextLevel = cell.level + 1;
            const cfg = BUILDING_CONFIGS[cell.type];
            const maxHp = cfg
              ? Math.round(
                  cfg.maxHp *
                  buildingLevelMultiplier(cell.type, nextLevel) *
                  buildingHpResearchMultiplier(state.researchedNodeIds, cell.type),
                )
              : cell.maxHp;
            grid[row][col] = { ...cell, level: nextLevel, hp: maxHp, maxHp };
          }
        }
        // Second half → remove
        for (let i = pairs; i < mergeCount; i++) {
          const { row, col } = batch[i];
          grid[row][col] = null;
        }
        totalMerged += pairs;

        const [typeName] = key.split(':');
        const cfg = BUILDING_CONFIGS[typeName as BuildingType];
        const levelAfter = (grid[batch[0].row]?.[batch[0].col]?.level ?? 1);
        if (cfg) mergeMessages.push(`${cfg.nameJP}×${mergeCount}→Lv.${levelAfter}×${pairs}`);
      }
    }

    if (totalMerged > 0) {
      set({
        townGrid: grid,
        message: `✨ 自動合成！ ${mergeMessages.join(' / ')}`,
        messageTimer: 3,
      });
    }
  },

  battleTick: (dt) => {
    const state = get();
    if (state.mode !== 'battle') return;

    let msgTimer = Math.max(0, state.messageTimer - dt);
    let { wave, waveTimer, stageIndex, resources } = state;
    const strategy = state.battleStrategy;
    const strategyTimer = state.strategyTimer + dt;
    const maxWaves = MAX_STAGE_WAVES[stageIndex] ?? 3;
    let newMsg = state.message;
    let newMsgTimer = msgTimer;

    let allUnits: Unit[] = [...state.playerUnits, ...state.enemyUnits];
    const newProjectiles: Projectile[] = [...state.projectiles];
    const destroyedIds = new Set<string>();
    const newBuildings = [...state.battleBuildings];
    const newTowerTimers = { ...state.towerTimers };
    let battleHero: BattleHero | null = state.battleHero
      ? {
          ...state.battleHero,
          attackTimer: Math.max(0, state.battleHero.attackTimer - dt),
          skillTimer: Math.max(0, state.battleHero.skillTimer - dt),
          skillActiveTimer: Math.max(0, state.battleHero.skillActiveTimer - dt),
          activeBuffDamageMult: state.battleHero.skillActiveTimer - dt > 0 ? state.battleHero.activeBuffDamageMult : 1,
          activeBuffSpeedMult: state.battleHero.skillActiveTimer - dt > 0 ? state.battleHero.activeBuffSpeedMult : 1,
        }
      : null;
    let heroDamageTaken = 0;

    for (let bi = 0; bi < newBuildings.length; bi++) {
      const b = newBuildings[bi];
      if (b.faction !== 'player' || b.type !== 'tower') continue;
      newTowerTimers[b.id] = (newTowerTimers[b.id] ?? 0) + dt;
      if (newTowerTimers[b.id] >= TOWER_FIRE_RATE) {
        const tx = bWorldX(b.gridX);
        const tz = bWorldZ(b.gridZ);
        const target = allUnits.find(
          (u) => u.faction === 'enemy' && dist(tx, tz, u.x, u.z) <= TOWER_RANGE
        );
        if (target) {
          newProjectiles.push({
            id: nanoid(),
            x: tx,
            z: tz,
            y: 2.5,
            targetX: target.x,
            targetZ: target.z,
            damage: Math.round(TOWER_DAMAGE * buildingLevelMultiplier(b.type, b.level)),
            faction: 'player',
            speed: 18,
            sourceId: b.id,
          });
          newTowerTimers[b.id] = 0;
        }
      }
    }

    // Track damage dealt this tick per unit id, applied after the loop
    const hpDeltas = new Map<string, number>();

    // Hero skill activation is data-driven. A requested skill waits until a valid
    // target exists, which makes the button safe to press during a transition.
    if (battleHero && battleHero.hp > 0) {
      const heroDefinition = heroById(battleHero.definitionId);
      const skill = heroDefinition?.skill;
      if (skill && battleHero.skillRequested && battleHero.skillTimer <= 0) {
        const skillTargets = allUnits
          .filter((unit) => unit.faction === 'enemy' && unit.hp - (hpDeltas.get(unit.id) ?? 0) > 0)
          .sort((a, b) => dist(battleHero!.x, battleHero!.z, a.x, a.z) - dist(battleHero!.x, battleHero!.z, b.x, b.z))
          .filter((unit) => dist(battleHero!.x, battleHero!.z, unit.x, unit.z) <= (skill.radius ?? 8))
          .slice(0, Math.max(1, (skill.targetCount ?? 1) + Math.floor(battleHero.synergyScore - 1)));

        if (skill.kind === 'multi_attack' && skillTargets.length > 0) {
          skillTargets.forEach((target) => {
            hpDeltas.set(
              target.id,
              (hpDeltas.get(target.id) ?? 0) + Math.round(battleHero!.damage * (skill.damageMultiplier ?? 1)),
            );
          });
          battleHero = {
            ...battleHero,
            skillTimer: skill.cooldown,
            skillRequested: false,
            state: 'skill',
          };
          newMsg = `${heroDefinition.nameJP}の${skill.nameJP}！${skillTargets.length}体に命中`;
          newMsgTimer = 2;
        } else if (skill.kind === 'archetype_buff') {
          const duration = (skill.duration ?? 8) * battleHero.synergyScore;
          battleHero = {
            ...battleHero,
            skillTimer: skill.cooldown,
            skillActiveTimer: duration,
            activeBuffDamageMult: 1 + ((skill.buffDamageMultiplier ?? 1) - 1) * battleHero.synergyScore,
            activeBuffSpeedMult: 1 + ((skill.buffSpeedMultiplier ?? 1) - 1) * battleHero.synergyScore,
            skillRequested: false,
            state: 'skill',
          };
          newMsg = `${heroDefinition.nameJP}の${skill.nameJP}！${heroDefinition.nameJP}の適正兵種を強化`;
          newMsgTimer = 2;
        }
      }

      // Heroes participate in combat independently from ordinary units.
      const heroTarget = allUnits
        .filter((unit) => unit.faction === 'enemy' && unit.hp - (hpDeltas.get(unit.id) ?? 0) > 0)
        .reduce((best, unit) => {
          if (!best) return unit;
          return dist(battleHero!.x, battleHero!.z, unit.x, unit.z) <
            dist(battleHero!.x, battleHero!.z, best.x, best.z) ? unit : best;
        }, undefined as Unit | undefined);
      if (heroTarget) {
        const targetDistance = dist(battleHero.x, battleHero.z, heroTarget.x, heroTarget.z);
        if (targetDistance <= battleHero.attackRange) {
          battleHero.state = battleHero.state === 'skill' ? 'skill' : 'attacking';
          if (battleHero.attackTimer <= 0) {
            hpDeltas.set(heroTarget.id, (hpDeltas.get(heroTarget.id) ?? 0) + battleHero.damage);
            battleHero.attackTimer = battleHero.attackCooldown;
          }
        } else {
          battleHero.state = 'moving';
          const angle = Math.atan2(heroTarget.z - battleHero.z, heroTarget.x - battleHero.x);
          battleHero.x += Math.cos(angle) * battleHero.speed * dt;
          battleHero.z += Math.sin(angle) * battleHero.speed * dt;
        }
      } else {
        battleHero.state = 'idle';
      }
    }

    const updatedUnits: Unit[] = [];
    for (const unit of allUnits) {
      let u = { ...unit };

      // Skip if already killed by damage queued earlier this tick
      const dmgSoFar = hpDeltas.get(u.id) ?? 0;
      if (u.hp - dmgSoFar <= 0) continue;

      // Only consider enemies that are still alive (accounting for queued damage)
      const enemies = allUnits.filter(
        (o) => o.faction !== u.faction && o.hp - (hpDeltas.get(o.id) ?? 0) > 0
      );
      const enemyBuildings = newBuildings.filter((b) => b.faction !== u.faction);

      let tgt = u.targetId ? allUnits.find((x) => x.id === u.targetId) : undefined;
      // Retarget if target is dead (including queued damage)
      if (!tgt || tgt.hp - (hpDeltas.get(tgt.id) ?? 0) <= 0) {
        tgt = enemies.reduce((best, e) => {
          const d = dist(u.x, u.z, e.x, e.z);
          return !best || d < dist(u.x, u.z, best.x, best.z) ? e : best;
        }, undefined as Unit | undefined);
        u.targetId = tgt?.id ?? null;
      }

      const tgtBuilding = enemyBuildings.reduce((best, b) => {
        const bx = bWorldX(b.gridX);
        const bz = bWorldZ(b.gridZ);
        const d = dist(u.x, u.z, bx, bz);
        if (!best) return { b, d };
        const bd = dist(u.x, u.z, bWorldX(best.b.gridX), bWorldZ(best.b.gridZ));
        return d < bd ? { b, d } : best;
      }, undefined as { b: Building; d: number } | undefined);

      u.attackTimer = Math.max(0, u.attackTimer - dt);

      // Heroes are valid enemy targets as well as ordinary units. This keeps
      // hero HP meaningful without mixing hero state into the unit roster.
      if (
        u.faction === 'enemy' &&
        battleHero &&
        battleHero.hp > 0 &&
        dist(u.x, u.z, battleHero.x, battleHero.z) <= u.attackRange + 0.25
      ) {
        u.state = 'attacking';
        if (u.attackTimer <= 0) {
          heroDamageTaken += u.damage;
          u.attackTimer = u.attackCooldown;
        }
        updatedUnits.push(u);
        continue;
      }

      // ── Strategy-specific movement for player units ──────────────────────
      // DEFEND_LINE_X: just inside player zone (bWorldX(10) = -10)
      // FRONTLINE_X: midfield (bWorldX(14) = 0)
      // WAVE_CYCLE: 13s total (8s advance + 5s hold)
      const DEFEND_LINE_X = bWorldX(10);
      const FRONTLINE_X = bWorldX(14);
      const WAVE_CYCLE = 13;
      const WAVE_ADVANCE_DUR = 8;

      if (u.faction === 'player' && strategy !== 'massacre') {
        switch (strategy) {
          case 'base_rush': {
            // Rush enemy townhall directly; only fight units already in attack range
            const enemyBase = enemyBuildings.find((b) => b.type === 'townhall') ?? enemyBuildings[0];
            if (tgt && dist(u.x, u.z, tgt.x, tgt.z) <= u.attackRange) {
              u.state = 'attacking';
              if (u.attackTimer <= 0) {
                hpDeltas.set(tgt.id, (hpDeltas.get(tgt.id) ?? 0) + unitDamageWithHero(u, battleHero));
                u.attackTimer = u.attackCooldown;
              }
            } else if (enemyBase) {
              const bx = bWorldX(enemyBase.gridX);
              const bz = bWorldZ(enemyBase.gridZ);
              const d = dist(u.x, u.z, bx, bz);
              if (d <= u.attackRange + 0.8) {
                u.state = 'attacking';
                if (u.attackTimer <= 0) {
                  const bi = newBuildings.findIndex((b) => b.id === enemyBase.id);
                  if (bi >= 0) {
                    newBuildings[bi] = { ...newBuildings[bi], hp: newBuildings[bi].hp - unitDamageWithHero(u, battleHero) };
                    if (newBuildings[bi].hp <= 0) destroyedIds.add(newBuildings[bi].id);
                  }
                  u.attackTimer = u.attackCooldown;
                }
              } else {
                u.state = 'moving';
                const ang = Math.atan2(bz - u.z, bx - u.x);
                u.x += Math.cos(ang) * unitSpeedWithHero(u, battleHero) * dt;
                u.z += Math.sin(ang) * unitSpeedWithHero(u, battleHero) * dt;
              }
            }
            updatedUnits.push(u);
            continue;
          }

          case 'defend': {
            // Advance to defensive line, then chase & fight any enemy within
            // CHASE_RANGE — but never push past FRONTLINE_X (midfield).
            const DEFEND_CHASE = 14;
            const DEFEND_MAX_X = FRONTLINE_X; // don't cross midfield
            if (tgt) {
              const d = dist(u.x, u.z, tgt.x, tgt.z);
              if (d <= u.attackRange) {
                // Attack
                u.state = 'attacking';
                if (u.attackTimer <= 0) {
                  hpDeltas.set(tgt.id, (hpDeltas.get(tgt.id) ?? 0) + unitDamageWithHero(u, battleHero));
                  u.attackTimer = u.attackCooldown;
                }
              } else if (d <= DEFEND_CHASE && u.x < DEFEND_MAX_X) {
                // Chase enemy, capped at midfield
                u.state = 'moving';
                const ang = Math.atan2(tgt.z - u.z, tgt.x - u.x);
                u.x += Math.cos(ang) * unitSpeedWithHero(u, battleHero) * dt;
                u.z += Math.sin(ang) * unitSpeedWithHero(u, battleHero) * dt;
              } else if (u.x < DEFEND_LINE_X - 0.5) {
                // No nearby threat — advance to defensive line
                u.state = 'moving';
                u.x += unitSpeedWithHero(u, battleHero) * dt;
              } else {
                u.state = 'idle';
              }
            } else if (tgtBuilding && tgtBuilding.d <= u.attackRange + 0.8) {
              u.state = 'attacking';
              if (u.attackTimer <= 0) {
                const bi = newBuildings.findIndex((b) => b.id === tgtBuilding.b.id);
                if (bi >= 0) {
                  newBuildings[bi] = { ...newBuildings[bi], hp: newBuildings[bi].hp - unitDamageWithHero(u, battleHero) };
                  if (newBuildings[bi].hp <= 0) destroyedIds.add(newBuildings[bi].id);
                }
                u.attackTimer = u.attackCooldown;
              }
            } else if (u.x < DEFEND_LINE_X - 0.5) {
              u.state = 'moving';
              u.x += unitSpeedWithHero(u, battleHero) * dt;
            } else {
              u.state = 'idle';
            }
            updatedUnits.push(u);
            continue;
          }

          case 'frontline': {
            // Advance to midfield, then chase & fight enemies up to MAX_PUSH_X.
            // If no enemies nearby, drift back toward FRONTLINE_X.
            const FRONT_CHASE = 12;
            const FRONT_MAX_X = bWorldX(18); // can push ~10 units past midfield
            if (u.x >= FRONTLINE_X - 1) {
              // At or past frontline
              if (tgt) {
                const d = dist(u.x, u.z, tgt.x, tgt.z);
                if (d <= u.attackRange) {
                  u.state = 'attacking';
                  if (u.attackTimer <= 0) {
                    hpDeltas.set(tgt.id, (hpDeltas.get(tgt.id) ?? 0) + unitDamageWithHero(u, battleHero));
                    u.attackTimer = u.attackCooldown;
                  }
                } else if (d <= FRONT_CHASE && u.x < FRONT_MAX_X) {
                  // Pursue enemy up to max-push limit
                  u.state = 'moving';
                  const ang = Math.atan2(tgt.z - u.z, tgt.x - u.x);
                  u.x += Math.cos(ang) * unitSpeedWithHero(u, battleHero) * dt;
                  u.z += Math.sin(ang) * unitSpeedWithHero(u, battleHero) * dt;
                } else {
                  u.state = 'idle';
                }
              } else if (tgtBuilding && tgtBuilding.d <= u.attackRange + 0.8) {
                u.state = 'attacking';
                if (u.attackTimer <= 0) {
                  const bi = newBuildings.findIndex((b) => b.id === tgtBuilding.b.id);
                  if (bi >= 0) {
                    newBuildings[bi] = { ...newBuildings[bi], hp: newBuildings[bi].hp - unitDamageWithHero(u, battleHero) };
                    if (newBuildings[bi].hp <= 0) destroyedIds.add(newBuildings[bi].id);
                  }
                  u.attackTimer = u.attackCooldown;
                }
              } else {
                u.state = 'idle';
              }
              updatedUnits.push(u);
              continue;
            }
            // Haven't reached frontline — advance normally (fall through)
            break;
          }

          case 'wave_attack': {
            // 8s advance → 5s hold → repeat.
            // During hold: stop advancing but keep attacking / closing melee gap.
            const isHoldPhase = (strategyTimer % WAVE_CYCLE) >= WAVE_ADVANCE_DUR;
            if (isHoldPhase) {
              if (tgt) {
                const d = dist(u.x, u.z, tgt.x, tgt.z);
                if (d <= u.attackRange) {
                  // In range — attack
                  u.state = 'attacking';
                  if (u.attackTimer <= 0) {
                    hpDeltas.set(tgt.id, (hpDeltas.get(tgt.id) ?? 0) + unitDamageWithHero(u, battleHero));
                    u.attackTimer = u.attackCooldown;
                  }
                } else if (d <= u.attackRange * 1.5) {
                  // Close gap only for melee reach — don't chase further
                  u.state = 'moving';
                  const ang = Math.atan2(tgt.z - u.z, tgt.x - u.x);
                  u.x += Math.cos(ang) * unitSpeedWithHero(u, battleHero) * dt;
                  u.z += Math.sin(ang) * unitSpeedWithHero(u, battleHero) * dt;
                } else {
                  u.state = 'idle';
                }
              } else if (tgtBuilding && tgtBuilding.d <= u.attackRange + 0.8) {
                u.state = 'attacking';
                if (u.attackTimer <= 0) {
                  const bi = newBuildings.findIndex((b) => b.id === tgtBuilding.b.id);
                  if (bi >= 0) {
                    newBuildings[bi] = { ...newBuildings[bi], hp: newBuildings[bi].hp - unitDamageWithHero(u, battleHero) };
                    if (newBuildings[bi].hp <= 0) destroyedIds.add(newBuildings[bi].id);
                  }
                  u.attackTimer = u.attackCooldown;
                }
              } else {
                u.state = 'idle';
              }
              updatedUnits.push(u);
              continue;
            }
            // Advance phase — fall through to default movement
            break;
          }
        }
      }

      // ── Default movement (massacre / fallthrough from other strategies) ──
      if (tgt && dist(u.x, u.z, tgt.x, tgt.z) <= u.attackRange) {
        u.state = 'attacking';
        if (u.attackTimer <= 0) {
          hpDeltas.set(tgt.id, (hpDeltas.get(tgt.id) ?? 0) + unitDamageWithHero(u, battleHero));
          u.attackTimer = u.attackCooldown;
        }
      } else if (tgtBuilding && tgtBuilding.d <= u.attackRange + 0.8) {
        u.state = 'attacking';
        if (u.attackTimer <= 0) {
          const bi = newBuildings.findIndex((b) => b.id === tgtBuilding.b.id);
          if (bi >= 0) {
            newBuildings[bi] = { ...newBuildings[bi], hp: newBuildings[bi].hp - unitDamageWithHero(u, battleHero) };
            if (newBuildings[bi].hp <= 0) destroyedIds.add(newBuildings[bi].id);
          }
          u.attackTimer = u.attackCooldown;
        }
      } else if (tgt) {
        u.state = 'moving';
        const ang = Math.atan2(tgt.z - u.z, tgt.x - u.x);
        u.x += Math.cos(ang) * unitSpeedWithHero(u, battleHero) * dt;
        u.z += Math.sin(ang) * unitSpeedWithHero(u, battleHero) * dt;
      } else if (tgtBuilding) {
        u.state = 'moving';
        const bx = bWorldX(tgtBuilding.b.gridX);
        const bz = bWorldZ(tgtBuilding.b.gridZ);
        const ang = Math.atan2(bz - u.z, bx - u.x);
        u.x += Math.cos(ang) * unitSpeedWithHero(u, battleHero) * dt;
        u.z += Math.sin(ang) * unitSpeedWithHero(u, battleHero) * dt;
      } else {
        const targetX = u.faction === 'player' ? bWorldX(BATTLE_COLS - 2) : bWorldX(1);
        const ang = Math.atan2(0, targetX - u.x);
        u.x += Math.cos(ang) * unitSpeedWithHero(u, battleHero) * dt;
      }
      updatedUnits.push(u);
    }

    // Apply accumulated damage from this tick to all processed units.
    // HP is intentionally clamped/removed below, so a defeated unit never
    // remains in the store for another render frame.
    for (let i = 0; i < updatedUnits.length; i++) {
      const delta = hpDeltas.get(updatedUnits[i].id);
      if (delta) {
        updatedUnits[i] = { ...updatedUnits[i], hp: updatedUnits[i].hp - delta };
      }
    }

    const updatedProjectiles: Projectile[] = [];
    for (const proj of newProjectiles) {
      const d = dist(proj.x, proj.z, proj.targetX, proj.targetZ);
      if (d < 0.5) {
        const hitUnit = updatedUnits.find(
          (u) => u.hp > 0 && u.faction !== proj.faction && dist(proj.targetX, proj.targetZ, u.x, u.z) < 2
        );
        if (hitUnit) {
          const idx = updatedUnits.findIndex((u) => u.id === hitUnit.id);
          if (idx >= 0) updatedUnits[idx] = { ...updatedUnits[idx], hp: updatedUnits[idx].hp - proj.damage };
        }
        continue;
      }
      const ang = Math.atan2(proj.targetZ - proj.z, proj.targetX - proj.x);
      updatedProjectiles.push({
        ...proj,
        x: proj.x + Math.cos(ang) * proj.speed * dt,
        z: proj.z + Math.sin(ang) * proj.speed * dt,
      });
    }

    // Remove every unit that reached zero HP after both direct and projectile
    // damage. This is the single source of truth for the next game state.
    const defeatedUnits = updatedUnits.filter((u) => u.hp <= 0);
    const survivingUnits = updatedUnits.filter((u) => u.hp > 0);
    const survivingBuildings = newBuildings.filter((b) => !destroyedIds.has(b.id));

    const newWaveTimer = waveTimer - dt;
    let newWave = wave;
    let newEnemies = survivingUnits.filter((u) => u.faction === 'enemy');
    let newPlayers = survivingUnits.filter((u) => u.faction === 'player');

    // Capture player units removed above and accumulate their TownUnit IDs
    const justKilledIds = defeatedUnits
      .filter((u) => u.faction === 'player')
      .map((u) => u.townUnitId)
      .filter((id): id is string => Boolean(id));
    const allKilledIds = [...state.killedTownUnitIds, ...justKilledIds];
    if (battleHero) {
      battleHero = {
        ...battleHero,
        hp: Math.max(0, battleHero.hp - heroDamageTaken),
        state: battleHero.hp - heroDamageTaken <= 0 ? 'idle' : battleHero.state,
      };
    }

    if (newWaveTimer <= 0 && wave < maxWaves) {
      newWave = wave + 1;
      const spawnedEnemies = spawnWave(newWave, stageIndex);
      newEnemies = [...newEnemies, ...spawnedEnemies];
      newMsg = `ウェーブ ${newWave}/${maxWaves}！`;
      newMsgTimer = 3;
    }

    const playerBaseAlive = survivingBuildings.some((b) => b.id === 'player-base');
    const enemyBaseAlive = survivingBuildings.some((b) => b.id === 'enemy-base');

    if (!playerBaseAlive) {
      const casualties = applyBattleCasualties({
        townGrid: state.townGrid, townUnits: state.townUnits,
        hospitalWounded: state.hospitalWounded,
        battleInitialBuildingIds: state.battleInitialBuildingIds,
        survivingBuildings, killedTownUnitIds: allKilledIds,
      });
      set({
        mode: 'defeat',
        message: `本拠地が破壊された！${casualties.casualtyMsg}`,
        messageTimer: 5,
        townGrid: casualties.townGrid,
        townUnits: casualties.townUnits,
        hospitalWounded: casualties.hospitalWounded,
        killedTownUnitIds: [],
        battleHero: null,
      });
      return;
    }

    if (!enemyBaseAlive) {
      const nextStage = stageIndex + 1;
      const goldReward = 80 + stageIndex * 40;
      const casualties = applyBattleCasualties({
        townGrid: state.townGrid, townUnits: state.townUnits,
        hospitalWounded: state.hospitalWounded,
        battleInitialBuildingIds: state.battleInitialBuildingIds,
        survivingBuildings, killedTownUnitIds: allKilledIds,
      });
      if (nextStage >= STAGE_NAMES.length) {
        set({ mode: 'victory', townGrid: casualties.townGrid, townUnits: casualties.townUnits, hospitalWounded: casualties.hospitalWounded, killedTownUnitIds: [], battleHero: null });
      } else {
        const heroPatch = applyStageClearHeroShards(state.heroShards, state.ownedHeroIds, state.selectedHeroId, stageIndex);
        set({
          mode: 'stage_clear', stageIndex: nextStage,
          resources: { ...state.resources, gold: state.resources.gold + goldReward },
          heroShards: heroPatch.heroShards,
          ownedHeroIds: heroPatch.ownedHeroIds,
          selectedHeroId: heroPatch.selectedHeroId,
          message: `ステージクリア！ゴールド+${goldReward}${heroPatch.rewardMsg}${casualties.casualtyMsg}`,
          messageTimer: 4,
          townGrid: casualties.townGrid, townUnits: casualties.townUnits,
           hospitalWounded: casualties.hospitalWounded, killedTownUnitIds: [], battleHero: null,
        });
      }
      return;
    }

    const allWavesSpawned = newWave >= maxWaves;
    const noEnemiesLeft = newEnemies.length === 0;
    if (allWavesSpawned && noEnemiesLeft && wave > 0) {
      const nextStage = stageIndex + 1;
      const goldReward = 80 + stageIndex * 40;
      const casualties = applyBattleCasualties({
        townGrid: state.townGrid, townUnits: state.townUnits,
        hospitalWounded: state.hospitalWounded,
        battleInitialBuildingIds: state.battleInitialBuildingIds,
        survivingBuildings, killedTownUnitIds: allKilledIds,
      });
      if (nextStage >= STAGE_NAMES.length) {
        set({ mode: 'victory', townGrid: casualties.townGrid, townUnits: casualties.townUnits, hospitalWounded: casualties.hospitalWounded, killedTownUnitIds: [], battleHero: null });
      } else {
        const heroPatch = applyStageClearHeroShards(state.heroShards, state.ownedHeroIds, state.selectedHeroId, stageIndex);
        set({
          mode: 'stage_clear', stageIndex: nextStage,
          resources: { ...state.resources, gold: state.resources.gold + goldReward },
          heroShards: heroPatch.heroShards,
          ownedHeroIds: heroPatch.ownedHeroIds,
          selectedHeroId: heroPatch.selectedHeroId,
          message: `ステージクリア！ゴールド+${goldReward}${heroPatch.rewardMsg}${casualties.casualtyMsg}`,
          messageTimer: 4,
          townGrid: casualties.townGrid, townUnits: casualties.townUnits,
           hospitalWounded: casualties.hospitalWounded, killedTownUnitIds: [], battleHero: null,
        });
      }
      return;
    }

    set({
      wave: newWave,
      waveTimer: newWaveTimer <= 0 ? (MAX_STAGE_WAVES[stageIndex] > newWave ? 25 : 999) : newWaveTimer,
      battleBuildings: survivingBuildings,
      playerUnits: newPlayers,
      enemyUnits: newEnemies,
      projectiles: updatedProjectiles,
      towerTimers: newTowerTimers,
      resources,
      message: newMsg,
      messageTimer: newMsgTimer,
      killedTownUnitIds: allKilledIds,
      strategyTimer,
      battleHero,
    });
  },
}));

export { STAGE_NAMES, MAX_STAGE_WAVES, STAGE_DIFFICULTY_STARS, bWorldX, bWorldZ };
