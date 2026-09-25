import type { HeroArchetype, HeroRarity, HeroSkillKind, TownUnit } from './types';
import { UNIT_CONFIGS } from './constants';

export interface HeroSkillDefinition {
  id: string;
  nameJP: string;
  kind: HeroSkillKind;
  description: string;
  cooldown: number;
  /** Multiplier applied to the hero's damage for multi-target skills. */
  damageMultiplier?: number;
  /** Maximum number of units hit by a multi-target skill. */
  targetCount?: number;
  /** Radius around the hero in world units. */
  radius?: number;
  /** Duration of a matching-archetype buff in seconds. */
  duration?: number;
  /** Matching-archetype damage multiplier while the buff is active. */
  buffDamageMultiplier?: number;
  /** Matching-archetype speed multiplier while the buff is active. */
  buffSpeedMultiplier?: number;
}

export interface HeroDefinition {
  id: string;
  name: string;
  nameJP: string;
  emoji: string;
  rarity: HeroRarity;
  archetype: HeroArchetype;
  color: string;
  baseHp: number;
  baseDamage: number;
  attackRange: number;
  speed: number;
  skill: HeroSkillDefinition;
}

export const HERO_RARITY_META: Record<HeroRarity, { label: string; color: string }> = {
  common: { label: 'コモン', color: '#a8a8a8' },
  rare: { label: 'レア', color: '#55aaff' },
  legendary: { label: 'レジェンド', color: '#ffd166' },
};

export const HERO_ARCHETYPE_META: Record<HeroArchetype, { label: string; icon: string }> = {
  melee: { label: '剣士', icon: '⚔️' },
  ranged: { label: '弓兵', icon: '🏹' },
  tank: { label: '盾兵', icon: '🛡️' },
  caster: { label: '魔法兵', icon: '🔮' },
  strike: { label: '突撃兵', icon: '🐎' },
};

/**
 * Hero catalog. Ownership is kept separately in the game store so this list
 * can later be replaced by a server/collection system without changing battle code.
 */
export const HERO_DEFINITIONS: HeroDefinition[] = [
  {
    id: 'iron_vanguard',
    name: 'Iron Vanguard',
    nameJP: '鉄壁の先鋒',
    emoji: '🛡️',
    rarity: 'common',
    archetype: 'tank',
    color: '#90a4ae',
    baseHp: 560,
    baseDamage: 28,
    attackRange: 2.2,
    speed: 2.1,
    skill: {
      id: 'shield_wall',
      nameJP: '鉄壁陣',
      kind: 'archetype_buff',
      description: '盾兵の防御線を鼓舞し、攻撃力と移動速度を高める。',
      cooldown: 18,
      duration: 8,
      buffDamageMultiplier: 1.22,
      buffSpeedMultiplier: 1.08,
    },
  },
  {
    id: 'red_blade',
    name: 'Red Blade',
    nameJP: '紅蓮の剣将',
    emoji: '⚔️',
    rarity: 'common',
    archetype: 'melee',
    color: '#ef5350',
    baseHp: 410,
    baseDamage: 46,
    attackRange: 2.5,
    speed: 2.9,
    skill: {
      id: 'blade_storm',
      nameJP: '旋風斬',
      kind: 'multi_attack',
      description: '周囲の敵をまとめて斬り払う。',
      cooldown: 15,
      damageMultiplier: 1.45,
      targetCount: 3,
      radius: 5.5,
    },
  },
  {
    id: 'wind_hunter',
    name: 'Wind Hunter',
    nameJP: '風読みの狩人',
    emoji: '🏹',
    rarity: 'rare',
    archetype: 'ranged',
    color: '#66bb6a',
    baseHp: 340,
    baseDamage: 58,
    attackRange: 8,
    speed: 3.0,
    skill: {
      id: 'rain_of_arrows',
      nameJP: '雨矢',
      kind: 'multi_attack',
      description: '遠くの敵を選んで一斉に射抜く。',
      cooldown: 17,
      damageMultiplier: 1.7,
      targetCount: 5,
      radius: 10,
    },
  },
  {
    id: 'arcane_oracle',
    name: 'Arcane Oracle',
    nameJP: '星詠みの賢者',
    emoji: '🔮',
    rarity: 'rare',
    archetype: 'caster',
    color: '#ba68c8',
    baseHp: 300,
    baseDamage: 64,
    attackRange: 7,
    speed: 2.4,
    skill: {
      id: 'astral_burst',
      nameJP: '星界爆破',
      kind: 'multi_attack',
      description: '敵の密集地点に星の魔力を落とす。',
      cooldown: 19,
      damageMultiplier: 1.35,
      targetCount: 6,
      radius: 8,
    },
  },
  {
    id: 'war_god',
    name: 'War God',
    nameJP: '軍神',
    emoji: '👑',
    rarity: 'legendary',
    archetype: 'melee',
    color: '#ffd54f',
    baseHp: 720,
    baseDamage: 92,
    attackRange: 3,
    speed: 3.2,
    skill: {
      id: 'war_banner',
      nameJP: '軍神の号令',
      kind: 'archetype_buff',
      description: '剣士の攻撃力と速度を大幅に引き上げる。',
      cooldown: 24,
      duration: 12,
      buffDamageMultiplier: 1.42,
      buffSpeedMultiplier: 1.16,
    },
  },
];

export function heroById(id: string | null | undefined): HeroDefinition | undefined {
  return id ? HERO_DEFINITIONS.find((hero) => hero.id === id) : undefined;
}

export interface HeroSynergy {
  score: number;
  matchingCount: number;
  averageTier: number;
}

/**
 * Synergy deliberately uses both quantity and quality. It is capped so a large
 * army remains valuable without making a single hero completely replace units.
 */
export function calculateHeroSynergy(hero: HeroDefinition, townUnits: TownUnit[]): HeroSynergy {
  const matching = townUnits.filter((unit) => UNIT_CONFIGS[unit.type].archetype === hero.archetype);
  const averageTier = matching.length
    ? matching.reduce((sum, unit) => sum + UNIT_CONFIGS[unit.type].barracksTier, 0) / matching.length
    : 0;
  const score = Math.min(2.5, 1 + matching.length * 0.04 + averageTier * 0.035);
  return {
    score: Math.round(score * 100) / 100,
    matchingCount: matching.length,
    averageTier: Math.round(averageTier * 10) / 10,
  };
}

export function heroSkillSummary(hero: HeroDefinition, synergyScore: number): string {
  const skill = hero.skill;
  if (skill.kind === 'multi_attack') {
    return `${skill.nameJP}：最大${skill.targetCount ?? 1}体に攻撃（シナジーで威力×${synergyScore.toFixed(2)}）`;
  }
  return `${skill.nameJP}：${HERO_ARCHETYPE_META[hero.archetype].label}を強化（シナジーで効果×${synergyScore.toFixed(2)}）`;
}