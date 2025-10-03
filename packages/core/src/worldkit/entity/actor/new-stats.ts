import { Actor, Stat, CoreStats, ActorStats } from '~/types/entity/actor';
import { ModifiableScalarAttribute } from '~/types/entity/attribute';
import { AppliedModifiers } from '~/types/modifier';

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
export function getStat(actor: Actor, stat: Stat): ModifiableScalarAttribute {
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
  if (!attr) {
    throw new Error(`Actor's current shell does not have shell stat ${stat}`);
  }
  return attr;
}

/**
 * Get the effective value of a specific stat from an actor
 * This is what most consumers want - the final computed value
 */
export function getStatValue(actor: Actor, stat: Stat): number {
  return getStat(actor, stat).eff;
}

/**
 * Get the natural (base) value of a specific stat from an actor
 */
export function getNaturalStatValue(actor: Actor, stat: Stat): number {
  return getStat(actor, stat).nat;
}

/**
 * Get the stat modifiers for a specific stat
 */
export function getStatModifiers(actor: Actor, stat: Stat): AppliedModifiers {
  const statAttr = getStat(actor, stat);
  return statAttr.mods ?? {};
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
export function hasActiveStatModifiers(actor: Actor, stat: Stat): boolean {
  const modifiers = getStatModifiers(actor, stat);
  for (let modifierId in modifiers) {
    const modifier = modifiers[modifierId];
    if (modifier.position < 1.0) {
      return true;
    }
  }
  return false;
}

/**
 * Compute the effective stat value, applying modifiers
 * This recalculates from scratch - useful for validation or when modifiers change
 */
export function computeStatValue(actor: Actor, stat: Stat): number {
  const statAttr = getStat(actor, stat);
  const modifiers = statAttr.mods ?? {};

  // Single-pass optimization: filter and aggregate in one loop
  let totalBonus = 0;
  for (let modifierId in modifiers) {
    const modifier = modifiers[modifierId];
    if (modifier.position < 1.0) { // Only active modifiers
      totalBonus += modifier.value;
    }
  }

  // Clamp to valid stat range
  return Math.max(BASELINE_STAT_VALUE, Math.min(MAX_STAT_VALUE, statAttr.nat + totalBonus));
}

/**
 * Get all effective actor stats (core + current shell) as a unified view
 * Useful for displaying complete stat sheets
 */
export function getAllStats(actor: Actor): ActorStats {
  const coreStats: CoreStats = {
    [Stat.INT]: actor.stats[Stat.INT],
    [Stat.PER]: actor.stats[Stat.PER],
    [Stat.MEM]: actor.stats[Stat.MEM],
  };

  const currentShell = actor.shells[actor.currentShell];
  if (!currentShell) {
    throw new Error(`Actor has no current shell`);
  }

  return {
    ...coreStats,
    ...currentShell.stats,
  };
}

/**
 * Set the natural value of a stat (useful for test setup and mutations)
 */
export function setNaturalStatValue(actor: Actor, stat: Stat, value: number): void {
  const statAttr = getStat(actor, stat);
  statAttr.nat = value;
}

/**
 * Set the effective value of a stat (useful for test setup)
 */
export function setStatValue(actor: Actor, stat: Stat, value: number): void {
  const statAttr = getStat(actor, stat);
  statAttr.eff = value;
}

/**
 * Set stat modifiers
 */
export function setStatModifiers(actor: Actor, stat: Stat, modifiers: AppliedModifiers): void {
  const statAttr = getStat(actor, stat);
  statAttr.mods = modifiers;
}

/**
 * Refresh the stats for an actor, recalculating effective values from natural + modifiers
 * This operation directly mutates the supplied actor
 */
export function refreshStats(actor: Actor, statNames?: readonly Stat[]): void {
  const statsToRefresh = statNames || ALL_STAT_NAMES;

  for (const stat of statsToRefresh) {
    const statAttr = getStat(actor, stat);
    const effectiveValue = computeStatValue(actor, stat);
    statAttr.eff = effectiveValue;
  }
}
