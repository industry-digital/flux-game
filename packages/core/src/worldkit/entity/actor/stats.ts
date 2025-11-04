import { Actor, Stat, ActorStats } from '~/types/entity/actor';
import { AppliedModifiers } from '~/types/modifier';
import { isActiveModifier } from '~/worldkit/entity/modifier';

// Actor-specific stat constants
export const BASELINE_STAT_VALUE = 10;
export const MAX_STAT_VALUE = 100;
export const NORMAL_STAT_RANGE = MAX_STAT_VALUE - BASELINE_STAT_VALUE;

export const ALL_STAT_NAMES = Object.values(Stat);
export const CORE_STAT_NAMES = [Stat.INT, Stat.PER, Stat.MEM] as const;
export const SHELL_STAT_NAMES = [Stat.POW, Stat.FIN, Stat.RES] as const;

/**
 * Calculate the bonus to a stat from a given value
 */
export function calculateStatBonus(statValue: number): number {
  return Math.floor((statValue - BASELINE_STAT_VALUE) / 2);
}

/**
 * Get a specific stat from an actor, automatically routing to core or shell stats
 * This is the primary interface - consumers don't need to know about routing
 */
export function getStat(actor: Actor, stat: Stat): number {
  if (stat === Stat.INT || stat === Stat.PER || stat === Stat.MEM) {
    // Core stats are stored directly on the actor
    const attr = actor.stats[stat];
    if (!attr) {
      throw new Error(`Actor does not have core stat ${stat}`);
    }
    return attr;
  }

  // Shell stats are stored on the current shell
  const currentShell = actor.shells[actor.currentShell];
  if (!currentShell) {
    throw new Error(`Actor has no current shell or shell not found`);
  }

  const attr = currentShell.stats[stat];
  if (attr === undefined) {
    throw new Error(`Actor's current shell does not have shell stat ${stat}`);
  }
  return attr;
}

/**
 * Get the effective value of a specific stat from an actor
 * This is what most consumers want - the final computed value
 */
export function getStatValue(actor: Actor, stat: Stat): number {
  return getStat(actor, stat);
}

/**
 * Get the natural (base) value of a specific stat from an actor
 * @deprecated `getStatValue` returns the natural stat value
 */
export function getNaturalStatValue(actor: Actor, stat: Stat): number {
  return getStat(actor, stat);
}

const NO_MODIFIERS: Readonly<AppliedModifiers> = Object.freeze({});

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
 * Get all effective actor stats (core + current shell) as a unified view
 * Useful for displaying complete stat sheets
 */
export function getAllStats(actor: Actor): ActorStats {
  const stats: Partial<ActorStats> = {
    [Stat.INT]: actor.stats[Stat.INT],
    [Stat.PER]: actor.stats[Stat.PER],
    [Stat.MEM]: actor.stats[Stat.MEM],
  };

  const currentShell = actor.shells[actor.currentShell];
  if (!currentShell) {
    throw new Error(`Actor has no current shell`);
  }

  stats[Stat.POW] = currentShell.stats[Stat.POW];
  stats[Stat.FIN] = currentShell.stats[Stat.FIN];
  stats[Stat.RES] = currentShell.stats[Stat.RES];

  return stats as ActorStats;
}

/**
 * Set the effective value of a stat (useful for test setup)
 */
export function setStatValue(actor: Actor, stat: Stat, value: number): void {
  if (stat === Stat.INT || stat === Stat.PER || stat === Stat.MEM) {
    actor.stats[stat] = value;
    return;
  }

  const currentShell = actor.shells[actor.currentShell];
  if (!currentShell) {
    throw new Error(`Actor has no current shell`);
  }
  currentShell.stats[stat] = value;
}

/**
 * Set stat modifiers
 */
export function setStatModifiers(actor: Actor, stat: Stat, modifiers: AppliedModifiers): void {
  throw new Error('setStatModifiers is not implemented');
}
