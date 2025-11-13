import { Actor, Stat, ActorStats } from '~/types/entity/actor';
import { AppliedModifiers } from '~/types/modifier';
import { isActiveModifier } from '~/worldkit/entity/modifier';

// Actor-specific stat constants
export const BASELINE_STAT_VALUE = 10;
export const MAX_STAT_VALUE = 100;
export const NORMAL_STAT_RANGE = MAX_STAT_VALUE - BASELINE_STAT_VALUE;
export const ALL_STAT_NAMES = Object.values(Stat);

/**
 * Any entity that has a stats record
 * The generic parameter constrains which stats are available
 */
export type EntityWithStats<TStats extends Partial<Record<Stat, number>>> = {
  stats: TStats;
};

/**
 * Calculate the bonus to a stat from a given value
 */
export function calculateStatBonus(statValue: number): number {
  return Math.floor((statValue - BASELINE_STAT_VALUE) / 2);
}

/**
 * Get a specific stat from an entity
 * Type-safe: only allows getting stats that exist on the entity
 */
export function getStat<TStats extends Partial<Record<Stat, number>>, K extends keyof TStats & Stat>(
  entity: EntityWithStats<TStats>,
  stat: K
): number {
  const attr = entity.stats[stat];
  if (attr === undefined) {
    throw new Error(`Entity does not have stat ${stat}`);
  }
  return attr;
}

/**
 * Get the effective value of a specific stat from an entity
 * This is what most consumers want - the final computed value
 * Type-safe: only allows getting stats that exist on the entity
 */
export function getStatValue<TStats extends Partial<Record<Stat, number>>, K extends keyof TStats & Stat>(
  entity: EntityWithStats<TStats>,
  stat: K
): number {
  return getStat(entity, stat);
}

/**
 * Get the natural (base) value of a specific stat from an actor
 * @deprecated `getStatValue` returns the natural stat value
 */
export function getNaturalStatValue(actor: Actor, stat: Stat): number {
  return getStat(actor, stat);
}

/**
 * Get the stat modifiers for a specific stat
 */
export function getStatModifiers(actor: Actor, stat: Stat): AppliedModifiers {
  throw new Error('getStatModifiers is not implemented');
}

/**
 * Calculate effective stat bonus for an actor
 */
export function getStatBonus(actor: Actor, stat: Stat): number {
  const effectiveValue = getStatValue(actor, stat);
  return calculateStatBonus(effectiveValue);
}

/**
 * Check if a stat has active modifiers
 */
export function hasActiveStatModifiers(actor: Actor, stat: Stat, now: number): boolean {
  const modifiers = getStatModifiers(actor, stat);
  for (let modifierId in modifiers) {
    const modifier = modifiers[modifierId];
    if (isActiveModifier(modifier, now)) {
      return true;
    }
  }
  return false;
}

/**
 * Compute the effective stat value, applying modifiers
 * This recalculates from scratch - useful for validation or when modifiers change
 */
export function computeStatValue(actor: Actor, stat: Stat, now: number): number {
  return getStat(actor, stat); // TODO: Implement modifiers
}

/**
 * Get all actor stats
 */
export function getAllStats(actor: Actor): ActorStats {
  return actor.stats;
}

/**
 * Set the value of a stat on an entity
 * Type-safe: only allows setting stats that exist on the entity
 *
 * Examples:
 * - setStatValue(actor, Stat.INT, 10) ✓ (Actor has INT)
 * - setStatValue(shell, Stat.POW, 50) ✓ (Shell has POW)
 * - setStatValue(shell, Stat.INT, 10) ✗ (Shell doesn't have INT - compile error)
 */
export function setStatValue<TStats extends Partial<Record<Stat, number>>, K extends keyof TStats & Stat>(
  entity: EntityWithStats<TStats>,
  stat: K,
  value: number
): void {
  entity.stats[stat] = value;
}

/**
 * Set stat modifiers
 */
export function setStatModifiers(actor: Actor, stat: Stat, modifiers: AppliedModifiers): void {
  throw new Error('setStatModifiers is not implemented');
}
