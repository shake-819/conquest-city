import type { BuildingType, Resources } from './types';
import type { UnitArchetype } from './constants';

export type ResearchCategory =
  | 'fortification'
  | 'melee'
  | 'ranged'
  | 'tank'
  | 'caster'
  | 'resources'
  | 'heroes';

export type ResearchEffect =
  | { kind: 'building_hp'; target: 'townhall' | 'tower' | 'wall' | 'other'; multiplier: number }
  | { kind: 'unit_stats'; archetype: UnitArchetype; hpMultiplier: number; damageMultiplier: number }
  | { kind: 'resource_production'; multiplier: number }
  | { kind: 'hero_stats'; hpMultiplier: number; damageMultiplier: number };

type BuildingResearchTarget = 'townhall' | 'tower' | 'wall' | 'other';

export interface ResearchNodeDefinition {
  id: string;
  category: ResearchCategory;
  categoryLabel: string;
  categoryColor: string;
  name: string;
  description: string;
  effectLabel: string;
  cost: Resources;
  durationSec: number;
  prerequisiteId: string | null;
  effect: ResearchEffect;
}

const CATEGORY_META: Record<ResearchCategory, { label: string; color: string }> = {
  fortification: { label: '建物耐久', color: '#e07a5f' },
  melee: { label: '剣士強化', color: '#db504a' },
  ranged: { label: '弓兵強化', color: '#55a868' },
  tank: { label: '盾兵強化', color: '#6c91bf' },
  caster: { label: '魔法兵強化', color: '#9b72cf' },
  resources: { label: '資源生産', color: '#c49a4a' },
  heroes: { label: 'ヒーロー研究', color: '#d6a848' },
};

const cost = (gold: number, wood: number, stone: number, food: number): Resources => ({
  gold, wood, stone, food,
});

const buildingBranch = (
  target: BuildingResearchTarget,
  prefix: string,
  label: string,
  color: string,
  values: Array<{ hp: number; cost: Resources; durationSec: number }>,
): ResearchNodeDefinition[] =>
  values.map((value, index) => {
    const tier = index + 1;
    const id = `${prefix}_${tier}`;
    return {
      id,
      category: 'fortification',
      categoryLabel: CATEGORY_META.fortification.label,
      categoryColor: color,
      name: `${label}・強化 ${tier}`,
      description: `${label}の構造を改良し、戦闘で破壊されにくくする。`,
      effectLabel: `最大耐久力 +${Math.round(value.hp * 100)}%`,
      cost: value.cost,
      durationSec: value.durationSec,
      prerequisiteId: tier === 1 ? null : `${prefix}_${tier - 1}`,
      effect: { kind: 'building_hp', target, multiplier: value.hp },
    };
  });

const unitBranch = (
  category: Exclude<ResearchCategory, 'fortification' | 'resources' | 'heroes'>,
  archetype: UnitArchetype,
  label: string,
  values: Array<{ hp: number; damage: number; cost: Resources; durationSec: number }>,
): ResearchNodeDefinition[] =>
  values.map((value, index) => {
    const tier = index + 1;
    const id = `${category}_doctrine_${tier}`;
    return {
      id,
      category,
      categoryLabel: CATEGORY_META[category].label,
      categoryColor: CATEGORY_META[category].color,
      name: `${label}・戦技 ${tier}`,
      description: `${label}の装備・訓練体系を刷新し、前線での性能を高める。`,
      effectLabel: `HP +${Math.round(value.hp * 100)}% / 攻撃力 +${Math.round(value.damage * 100)}%`,
      cost: value.cost,
      durationSec: value.durationSec,
      prerequisiteId: tier === 1 ? null : `${category}_doctrine_${tier - 1}`,
      effect: { kind: 'unit_stats', archetype, hpMultiplier: value.hp, damageMultiplier: value.damage },
    };
  });

const resourceBranch: ResearchNodeDefinition[] = [0.1, 0.25, 0.45, 0.72, 1.05].map((multiplier, index) => {
  const tier = index + 1;
  return {
    id: `resource_engineering_${tier}`,
    category: 'resources',
    categoryLabel: CATEGORY_META.resources.label,
    categoryColor: CATEGORY_META.resources.color,
    name: `生産効率化 ${tier}`,
    description: '住宅・農場・採掘場・生産所の稼働効率を高める。',
    effectLabel: `全資源の生産量 +${Math.round(multiplier * 100)}%`,
    cost: [
      cost(700, 480, 420, 300),
      cost(1500, 1000, 900, 650),
      cost(3200, 2200, 1900, 1400),
      cost(6200, 4400, 3800, 2900),
      cost(11500, 8200, 7200, 5400),
    ][index],
    durationSec: 24 + index * 18,
    prerequisiteId: tier === 1 ? null : `resource_engineering_${tier - 1}`,
    effect: { kind: 'resource_production', multiplier },
  };
});

const heroBranch: ResearchNodeDefinition[] = [
  { hp: 0.12, damage: 0.12, cost: cost(900, 600, 500, 420), durationSec: 28 },
  { hp: 0.28, damage: 0.3, cost: cost(1900, 1300, 1100, 900), durationSec: 46 },
  { hp: 0.5, damage: 0.55, cost: cost(4000, 2800, 2400, 1900), durationSec: 72 },
  { hp: 0.78, damage: 0.88, cost: cost(7600, 5400, 4700, 3700), durationSec: 108 },
  { hp: 1.12, damage: 1.3, cost: cost(14500, 10300, 9000, 7000), durationSec: 156 },
].map((value, index) => {
  const tier = index + 1;
  return {
    id: `hero_arsenal_${tier}`,
    category: 'heroes',
    categoryLabel: CATEGORY_META.heroes.label,
    categoryColor: CATEGORY_META.heroes.color,
    name: `英雄兵站 ${tier}`,
    description: 'ヒーローの装備・戦術支援を整備し、戦場での生存力と打撃力を高める。',
    effectLabel: `HP +${Math.round(value.hp * 100)}% / 攻撃力 +${Math.round(value.damage * 100)}%`,
    cost: value.cost,
    durationSec: value.durationSec,
    prerequisiteId: tier === 1 ? null : `hero_arsenal_${tier - 1}`,
    effect: { kind: 'hero_stats', hpMultiplier: value.hp, damageMultiplier: value.damage },
  };
});

export const RESEARCH_DEFINITIONS: ResearchNodeDefinition[] = [
  ...buildingBranch('townhall', 'townhall_durability', '本拠地', '#e07a5f', [
    { hp: 0.15, cost: cost(800, 600, 700, 350), durationSec: 26 },
    { hp: 0.32, cost: cost(1800, 1300, 1500, 800), durationSec: 48 },
    { hp: 0.58, cost: cost(3800, 2900, 3200, 1800), durationSec: 78 },
    { hp: 0.9, cost: cost(7200, 5400, 6000, 3400), durationSec: 116 },
    { hp: 1.3, cost: cost(13800, 10400, 11600, 6600), durationSec: 168 },
  ]),
  ...buildingBranch('tower', 'tower_durability', '砲台', '#d97757', [
    { hp: 0.18, cost: cost(600, 450, 600, 280), durationSec: 22 },
    { hp: 0.38, cost: cost(1400, 1000, 1300, 650), durationSec: 42 },
    { hp: 0.68, cost: cost(3000, 2300, 2700, 1500), durationSec: 70 },
    { hp: 1.02, cost: cost(5800, 4400, 5200, 2800), durationSec: 104 },
    { hp: 1.46, cost: cost(11200, 8500, 10000, 5400), durationSec: 150 },
  ]),
  ...buildingBranch('wall', 'wall_durability', '壁', '#b88662', [
    { hp: 0.16, cost: cost(520, 420, 520, 220), durationSec: 20 },
    { hp: 0.34, cost: cost(1200, 950, 1200, 520), durationSec: 38 },
    { hp: 0.62, cost: cost(2600, 2100, 2500, 1200), durationSec: 64 },
    { hp: 0.94, cost: cost(5000, 4000, 4800, 2300), durationSec: 96 },
    { hp: 1.34, cost: cost(9600, 7700, 9200, 4400), durationSec: 138 },
  ]),
  ...buildingBranch('other', 'facility_durability', 'その他の建物', '#9e8f79', [
    { hp: 0.12, cost: cost(580, 500, 450, 260), durationSec: 21 },
    { hp: 0.28, cost: cost(1300, 1100, 1000, 600), durationSec: 40 },
    { hp: 0.52, cost: cost(2800, 2400, 2200, 1400), durationSec: 68 },
    { hp: 0.82, cost: cost(5400, 4700, 4300, 2700), durationSec: 100 },
    { hp: 1.18, cost: cost(10400, 9000, 8200, 5200), durationSec: 144 },
  ]),
  ...unitBranch('melee', 'melee', '剣士', [
    { hp: 0.08, damage: 0.1, cost: cost(700, 500, 350, 450), durationSec: 24 },
    { hp: 0.18, damage: 0.24, cost: cost(1500, 1100, 800, 950), durationSec: 44 },
    { hp: 0.34, damage: 0.48, cost: cost(3200, 2400, 1800, 2000), durationSec: 74 },
    { hp: 0.56, damage: 0.78, cost: cost(6200, 4700, 3500, 3800), durationSec: 112 },
    { hp: 0.84, damage: 1.18, cost: cost(12000, 9000, 6800, 7300), durationSec: 162 },
  ]),
  ...unitBranch('ranged', 'ranged', '弓兵', [
    { hp: 0.06, damage: 0.12, cost: cost(700, 500, 350, 450), durationSec: 24 },
    { hp: 0.15, damage: 0.27, cost: cost(1500, 1100, 800, 950), durationSec: 44 },
    { hp: 0.3, damage: 0.52, cost: cost(3200, 2400, 1800, 2000), durationSec: 74 },
    { hp: 0.48, damage: 0.84, cost: cost(6200, 4700, 3500, 3800), durationSec: 112 },
    { hp: 0.72, damage: 1.26, cost: cost(12000, 9000, 6800, 7300), durationSec: 162 },
  ]),
  ...unitBranch('tank', 'tank', '盾兵', [
    { hp: 0.14, damage: 0.06, cost: cost(700, 500, 350, 450), durationSec: 24 },
    { hp: 0.3, damage: 0.14, cost: cost(1500, 1100, 800, 950), durationSec: 44 },
    { hp: 0.58, damage: 0.28, cost: cost(3200, 2400, 1800, 2000), durationSec: 74 },
    { hp: 0.94, damage: 0.46, cost: cost(6200, 4700, 3500, 3800), durationSec: 112 },
    { hp: 1.42, damage: 0.72, cost: cost(12000, 9000, 6800, 7300), durationSec: 162 },
  ]),
  ...unitBranch('caster', 'caster', '魔法兵', [
    { hp: 0.05, damage: 0.14, cost: cost(700, 500, 350, 450), durationSec: 24 },
    { hp: 0.14, damage: 0.3, cost: cost(1500, 1100, 800, 950), durationSec: 44 },
    { hp: 0.28, damage: 0.58, cost: cost(3200, 2400, 1800, 2000), durationSec: 74 },
    { hp: 0.44, damage: 0.92, cost: cost(6200, 4700, 3500, 3800), durationSec: 112 },
    { hp: 0.68, damage: 1.38, cost: cost(12000, 9000, 6800, 7300), durationSec: 162 },
  ]),
  ...resourceBranch,
  ...heroBranch,
];

export function researchNodeById(id: string | null | undefined): ResearchNodeDefinition | undefined {
  return id ? RESEARCH_DEFINITIONS.find((node) => node.id === id) : undefined;
}

export function buildingHpResearchMultiplier(researchedIds: string[], type: BuildingType): number {
  const target = type === 'townhall' || type === 'tower' || type === 'wall' ? type : 'other';
  return 1 + RESEARCH_DEFINITIONS
    .filter((node) => researchedIds.includes(node.id) && node.effect.kind === 'building_hp' && node.effect.target === target)
    .reduce((sum, node) => sum + (node.effect.kind === 'building_hp' ? node.effect.multiplier : 0), 0);
}

export function unitResearchMultipliers(researchedIds: string[], archetype: UnitArchetype): { hp: number; damage: number } {
  return RESEARCH_DEFINITIONS
    .filter((node) => researchedIds.includes(node.id) && node.effect.kind === 'unit_stats' && node.effect.archetype === archetype)
    .reduce(
      (total, node) => node.effect.kind === 'unit_stats'
        ? { hp: total.hp + node.effect.hpMultiplier, damage: total.damage + node.effect.damageMultiplier }
        : total,
      { hp: 1, damage: 1 },
    );
}

export function resourceProductionResearchMultiplier(researchedIds: string[]): number {
  return 1 + RESEARCH_DEFINITIONS
    .filter((node) => researchedIds.includes(node.id) && node.effect.kind === 'resource_production')
    .reduce((sum, node) => sum + (node.effect.kind === 'resource_production' ? node.effect.multiplier : 0), 0);
}

export function heroResearchMultipliers(researchedIds: string[]): { hp: number; damage: number } {
  return RESEARCH_DEFINITIONS
    .filter((node) => researchedIds.includes(node.id) && node.effect.kind === 'hero_stats')
    .reduce(
      (total, node) => node.effect.kind === 'hero_stats'
        ? { hp: total.hp + node.effect.hpMultiplier, damage: total.damage + node.effect.damageMultiplier }
        : total,
      { hp: 1, damage: 1 },
    );
}