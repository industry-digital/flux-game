import { ModifiableScalarAttribute } from '~/types/entity/attribute';
import { AppliedModifiers } from '~/types/modifier';

export const BASELINE_STAT_VALUE = 10;
export const MAX_STAT_VALUE = 100;
export const NORMAL_STAT_RANGE = MAX_STAT_VALUE - BASELINE_STAT_VALUE;

// Generic types for entities with stats
export type HasStats<TStats extends Record<string, ModifiableScalarAttribute>> = {
  stats: TStats;
};

export type StatKey<TEntity extends HasStats<any>> = keyof TEntity['stats'];

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
    throw new Error(`Entity does not have a stat ${String(stat)}`);
  }
  return attr;
}

export function getEffectiveStatValue<TEntity extends HasStats<any>>(
  entity: TEntity,
  stat: StatKey<TEntity>,
  statState = getStat(entity, stat),
): number {
  return statState.eff;
}

export function getNaturalStatValue<TEntity extends HasStats<any>>(
  entity: TEntity,
  stat: StatKey<TEntity>,
  statState = getStat(entity, stat),
): number {
  return statState.nat;
}

export function getStatModifiers<TEntity extends HasStats<any>>(
  entity: TEntity,
  stat: StatKey<TEntity>,
  statState = getStat(entity, stat),
): AppliedModifiers {
  if (!statState) {
    throw new Error(`Entity does not have a stat ${String(stat)}`);
  }
  return statState.mods ?? {};
}

/**
 * Calculates the effective stat value by applying active modifiers to the natural base value
 * Filters out expired modifiers and clamps the result to valid stat range
 * @param entity - The entity to query
 * @param stat - The stat to calculate effective value for
 * @param statState - Optional pre-fetched base stat for performance
 * @param modifiers - Optional pre-fetched modifiers for performance
 * @returns Effective stat value (natural base + active modifiers, clamped to valid range)
 */
export function computeEffectiveStatValue<TEntity extends HasStats<any>>(
  entity: TEntity,
  stat: StatKey<TEntity>,
  statState = getStat(entity, stat),
  modifiers = getStatModifiers(entity, stat, statState),
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
  return Math.max(BASELINE_STAT_VALUE, Math.min(MAX_STAT_VALUE, statState.nat + totalBonus));
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
 * Calculate effective stat bonus
 * Includes modifier bonuses in the calculation
 * @param entity - The entity to query
 * @param stat - The stat to calculate bonus for
 * @returns Stat bonus including modifiers
 */
export function getEffectiveStatBonus<TEntity extends HasStats<any>>(
  entity: TEntity,
  stat: StatKey<TEntity>,
  statState = getStat(entity, stat),
): number {
  const effectiveValue = computeEffectiveStatValue(entity, stat, statState);
  return calculateStatBonus(effectiveValue);
}

/**
 * Refresh the stats for a generic entity with stats
 * This operation directly mutates the supplied entity
 */
export const refreshStats = <TEntity extends HasStats<any>> (
  entity: TEntity,
  statNames?: readonly (StatKey<TEntity>)[],
): void => {
  const defaultStats = statNames || (Object.keys(entity.stats) as StatKey<TEntity>[]);
  for (const stat of defaultStats) {
    const statState = getStat(entity, stat);
    const modifiers = getStatModifiers(entity, stat);
    const effectiveValue = computeEffectiveStatValue(entity, stat, statState, modifiers);

    statState.eff = effectiveValue;
    statState.mods = modifiers;
  }
};

export const mutateNaturalStatValue = <TEntity extends HasStats<any>> (
  entity: TEntity,
  stat: StatKey<TEntity>,
  value: number,
  statState = getStat(entity, stat),
) => {
  statState.nat = value;
};

export const mutateStatModifiers = <TEntity extends HasStats<any>> (
  entity: TEntity,
  stat: StatKey<TEntity>,
  mods: AppliedModifiers,
  statState = getStat(entity, stat),
):void => {
  statState.mods = mods;
};
