import { ActorStat } from '~/types/entity/actor';
import { ModifiableScalarAttribute } from '~/types/entity/attribute';
import { AppliedModifiers } from '~/types/modifier';

export const ALL_STAT_NAMES = Object.values(ActorStat);
export const BASELINE_STAT_VALUE = 10;
export const MAX_STAT_VALUE = 100;
export const NORMAL_STAT_RANGE = MAX_STAT_VALUE - BASELINE_STAT_VALUE;

// Generic types for entities with stats
export type HasStats<TStats extends Record<string, ModifiableScalarAttribute>> = {
  id: string;
  stats: TStats;
};

export type StatKey<TEntity extends HasStats<any>> = keyof TEntity['stats'];

// Shell-specific stat names
export const SHELL_STAT_NAMES = [ActorStat.POW, ActorStat.FIN, ActorStat.RES] as const;
export type ShellStatKey = typeof SHELL_STAT_NAMES[number];

/**
 * Calculate the bonus to a stat from a given value
 */
export function calculateStatBonus(statValue: number): number {
  return Math.floor((statValue - BASELINE_STAT_VALUE) / 2);
}

export function getStat<TEntity extends HasStats<any>>(
  entity: TEntity,
  stat: StatKey<TEntity>,
): ModifiableScalarAttribute {
  const attr = entity.stats[stat];
  if (!attr) {
    throw new Error(`Entity ${entity.id} does not have a stat ${String(stat)}`);
  }
  return attr;
}

export function getEffectiveStatValue<TEntity extends HasStats<any>>(
  entity: TEntity,
  stat: StatKey<TEntity>,
  baseStat = getStat(entity, stat),
): number {
  return baseStat.eff;
}

export function getNaturalStatValue<TEntity extends HasStats<any>>(
  entity: TEntity,
  stat: StatKey<TEntity>,
  baseStat = getStat(entity, stat),
): number {
  return baseStat.nat;
}

export function getStatModifiers<TEntity extends HasStats<any>>(
  entity: TEntity,
  stat: StatKey<TEntity>,
  statState = getStat(entity, stat),
): AppliedModifiers {
  if (!statState) {
    throw new Error(`Entity ${entity.id} does not have a stat ${String(stat)}`);
  }
  return statState.mods ?? {};
}

/**
 * Calculates the effective stat value by applying active modifiers to the natural base value
 * Filters out expired modifiers and clamps the result to valid stat range
 * @param actor - The actor to query
 * @param stat - The stat to calculate effective value for
 * @param baseStat - Optional pre-fetched base stat for performance
 * @param modifiers - Optional pre-fetched modifiers for performance
 * @returns Effective stat value (natural base + active modifiers, clamped to valid range)
 */
export function computeEffectiveStatValue<TEntity extends HasStats<any>>(
  entity: TEntity,
  stat: StatKey<TEntity>,
  baseStat = getStat(entity, stat),
  modifiers = getStatModifiers(entity, stat),
): number {
  // Single-pass optimization: filter and aggregate in one loop
  let totalBonus = 0;
  for (let modifierId in modifiers) {
    const modifier = modifiers[modifierId];
    if (modifier.position < 1.0) { // Only active modifiers
      totalBonus += modifier.value;
    }
  }

  // Clamp to valid stat range
  return Math.max(BASELINE_STAT_VALUE, Math.min(MAX_STAT_VALUE, baseStat.nat + totalBonus));
}

/**
 * Generic version of hasActiveStatModifiers
 */
export function hasGenericActiveStatModifiers<TEntity extends HasStats<any>>(
  entity: TEntity,
  stat: StatKey<TEntity>,
): boolean {
  const modifiers = getStatModifiers(entity, stat);
  for (let modifierId in modifiers) {
    const modifier = modifiers[modifierId];
    if (modifier.position < 1.0) {
      return true;
    }
  }
  return false;
}

/**
 * Generic version of getStatModifierBonus
 */
export function getGenericStatModifierBonus<TEntity extends HasStats<any>>(
  entity: TEntity,
  stat: StatKey<TEntity>,
  modifiers: AppliedModifiers = getStatModifiers(entity, stat),
): number {
  // Single-pass optimization: filter and aggregate in one loop
  let totalBonus = 0;
  for (let modifierId in modifiers) {
    const modifier = modifiers[modifierId];
    if (modifier.position < 1.0) { // Only active modifiers
      totalBonus += modifier.value;
    }
  }

  return totalBonus;
}

/**
 * Calculate effective stat bonus
 * Includes modifier bonuses in the calculation
 * @param actor - The actor to query
 * @param stat - The stat to calculate bonus for
 * @returns Stat bonus including modifiers
 */
export function getEffectiveStatBonus<TEntity extends HasStats<any>>(
  entity: TEntity,
  stat: StatKey<TEntity>,
): number {
  const effectiveValue = computeEffectiveStatValue(entity, stat);
  return calculateStatBonus(effectiveValue);
}

export function refreshStats<TEntity extends HasStats<any>>(
  entity: TEntity,
  statNames: readonly (StatKey<TEntity>)[] = ALL_STAT_NAMES,
): void {
  for (const stat of statNames) {
    const statState = getStat(entity, stat);
    const modifiers = getStatModifiers(entity, stat);
    const effectiveValue = computeEffectiveStatValue(entity, stat, statState, modifiers);

    statState.eff = effectiveValue;
    statState.mods = modifiers;
  }
}
