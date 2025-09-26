import { Actor, ActorStat } from '~/types/entity/actor';
import { ModifiableScalarAttribute } from '~/types/entity/attribute';
import { AppliedModifiers } from '~/types/modifier';

const ALL_STAT_NAMES = Object.values(ActorStat);
export const BASELINE_STAT_VALUE = 10;
export const MAX_STAT_VALUE = 100;
export const NORMAL_STAT_RANGE = MAX_STAT_VALUE - BASELINE_STAT_VALUE;

/**
 * Calculate the bonus to a stat from a given value
 * We are straight up stealing this status bonus formula from Pathfinder 2E
 */
export function calculateStatBonus(statValue: number): number {
  return Math.floor((statValue - BASELINE_STAT_VALUE) / 2);
}

export function getActorStat(actor: Actor, stat: ActorStat): ModifiableScalarAttribute {
  const attr = actor.stats[stat];
  if (!attr) {
    throw new Error(`Actor ${actor.id} does not have a stat ${stat}`);
  }
  return attr;
}

/**
 * Extract all modifiers affecting a specific stat
 * @param actor - The actor to query
 * @param stat - The stat to get modifiers for
 * @returns Applied modifiers for the stat
 */
export function getActorStatModifiers(
  actor: Actor,
  stat: ActorStat,
): AppliedModifiers {
  const statState = actor.stats[stat];
  if (!statState) {
    throw new Error(`Actor ${actor.id} does not have a stat ${stat}`);
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
export function computeEffectiveStatValue(
  actor: Actor,
  stat: ActorStat,
  baseStat = getActorStat(actor, stat),
  modifiers = getActorStatModifiers(actor, stat),
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
 * Check if an actor has any active modifiers on a stat
 * @param actor - The actor to query
 * @param stat - The stat to check
 * @returns True if the stat has active (non-expired) modifiers
 */
export function hasActiveStatModifiers(
  actor: Actor,
  stat: ActorStat,
): boolean {
  const modifiers = getActorStatModifiers(actor, stat);
  for (let modifierId in modifiers) {
    const modifier = modifiers[modifierId];
    if (modifier.position < 1.0) {
      return true;
    }
  }
  return false;
}

/**
 * Get the total modifier bonus for a stat (for debugging/UI)
 * @param actor - The actor to query
 * @param stat - The stat to calculate bonus for
 * @param modifiers - Optional pre-extracted modifiers array for performance
 * @returns Total modifier bonus (positive or negative)
 */
export function getStatModifierBonus(
  actor: Actor,
  stat: ActorStat,
  modifiers: AppliedModifiers = getActorStatModifiers(actor, stat),
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
 * Calculate effective stat bonus using Pathfinder 2E formula
 * Includes modifier bonuses in the calculation
 * @param actor - The actor to query
 * @param stat - The stat to calculate bonus for
 * @returns Stat bonus including modifiers
 */
export function getEffectiveStatBonus(
  actor: Actor,
  stat: ActorStat,
): number {
  const effectiveValue = computeEffectiveStatValue(actor, stat);
  return calculateStatBonus(effectiveValue);
}

export function refreshActorStats(actor: Actor): void {
  for (const stat of ALL_STAT_NAMES) {
    const statState = getActorStat(actor, stat);
    const modifiers = getActorStatModifiers(actor, stat);
    const effectiveValue = computeEffectiveStatValue(actor, stat, statState, modifiers);

    statState.eff = effectiveValue;
    statState.mods = modifiers;
  }
}

/**
 * @deprecated
 */
export type ActorStatApi = {
  getActorStat: typeof getActorStat;
  getActorStatModifiers: typeof getActorStatModifiers;
  getEffectiveStatValue: typeof computeEffectiveStatValue;
  hasActiveStatModifiers: typeof hasActiveStatModifiers;
  getStatModifierBonus: typeof getStatModifierBonus;
  getEffectiveStatBonus: typeof getEffectiveStatBonus;
  refreshActorStats: typeof refreshActorStats;
};

const SINGLETON_ACTOR_STAT_API: ActorStatApi = {
  getActorStat: getActorStat,
  getActorStatModifiers: getActorStatModifiers,
  getEffectiveStatValue: computeEffectiveStatValue,
  hasActiveStatModifiers: hasActiveStatModifiers,
  getStatModifierBonus: getStatModifierBonus,
  getEffectiveStatBonus: getEffectiveStatBonus,
  refreshActorStats: refreshActorStats,
};

/**
 * @deprecated
 */
export const createActorStatApi = (): ActorStatApi => {
  return SINGLETON_ACTOR_STAT_API;
};
