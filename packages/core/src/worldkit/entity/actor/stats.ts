import { ActorStat } from '~/types/entity/actor';
import { Actor } from '~/types/entity/actor';
import { ShellStats } from '~/types/entity/actor';
import { CoreStats } from '~/types/entity/actor';
import { ActorStats } from '~/types/entity/actor';
import { ModifiableScalarAttribute } from '~/types/entity/attribute';
import { AppliedModifiers } from '~/types/modifier';

export const ALL_STAT_NAMES = Object.values(ActorStat);
export const CORE_STAT_NAMES = [ActorStat.INT, ActorStat.PER, ActorStat.MEM] as const;
export const SHELL_STAT_NAMES = [ActorStat.POW, ActorStat.FIN, ActorStat.RES] as const;
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
    throw new Error(`Entity ${entity.id} does not have a stat ${String(stat)}`);
  }
  return statState.mods ?? {};
}

/**
 * Calculates the effective stat value by applying active modifiers to the natural base value
 * Filters out expired modifiers and clamps the result to valid stat range
 * @param actor - The actor to query
 * @param stat - The stat to calculate effective value for
 * @param statState - Optional pre-fetched base stat for performance
 * @param modifiers - Optional pre-fetched modifiers for performance
 * @returns Effective stat value (natural base + active modifiers, clamped to valid range)
 */
export function computeEffectiveStatValue<TEntity extends HasStats<any>>(
  entity: TEntity,
  stat: StatKey<TEntity>,
  statState = getStat(entity, stat),
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
 * @param actor - The actor to query
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
 * Refresh the stats for an entity
 * This operation directly mutates the supplied entity
 */
export const refreshStats = <TEntity extends HasStats<any>> (
  entity: TEntity,
  statNames: readonly (StatKey<TEntity>)[] = ALL_STAT_NAMES,
): void => {
  for (const stat of statNames) {
    const statState = getStat(entity, stat);
    const modifiers = getStatModifiers(entity, stat);
    const effectiveValue = computeEffectiveStatValue(entity, stat, statState, modifiers);

    statState.eff = effectiveValue;
    statState.mods = modifiers;
  }
};

export const mutateNaturalStatValue = <TEntity extends HasStats<any>> (
  entity: TEntity,
  stat: ActorStat,
  value: number,
  statState = getStat(entity, stat),
) => {
  statState.nat = value;
};

export const mutateStatModifiers = <TEntity extends HasStats<any>> (
  entity: TEntity,
  stat: ActorStat,
  mods: AppliedModifiers,
  statState = getStat(entity, stat),
):void => {
  statState.mods = mods;
};

// ============================================================================
// COMPUTED PROPERTIES - Phase 1 of Core/Shell Stats Migration
// ============================================================================

/**
 * Get the current shell's stats from an actor
 * @param actor - The actor to get shell stats from
 * @returns The current shell's stats
 */
export const getCurrentShellStats = (actor: Actor): ShellStats => {
  const currentShell = actor.shells[actor.currentShell];
  if (!currentShell) {
    throw new Error(`Actor ${actor.id} has no current shell or shell not found: ${actor.currentShell}`);
  }
  return currentShell.stats;
};

/**
 * Get a specific stat value from an actor, automatically routing to core or shell stats
 * @param actor - The actor to get the stat from
 * @param stat - The stat to retrieve
 * @returns The stat's ModifiableScalarAttribute
 */
export const getActorStat = (actor: Actor, stat: ActorStat): ModifiableScalarAttribute => {
  // Core stats come from actor.stats
  if (stat === ActorStat.INT || stat === ActorStat.PER || stat === ActorStat.MEM) {
    return getStat(actor, stat);
  }

  // Shell stats come from current shell
  const currentShellStats = getCurrentShellStats(actor);
  return getStat({ id: actor.currentShell, stats: currentShellStats }, stat);
};

/**
 * Get all effective actor stats (core + current shell) as a unified view
 * @param actor - The actor to get stats from
 * @returns Combined ActorStats object with core and shell stats
 */
export const getEffectiveActorStats = (actor: Actor): ActorStats => {
  const coreStats: CoreStats = {
    [ActorStat.INT]: actor.stats[ActorStat.INT],
    [ActorStat.PER]: actor.stats[ActorStat.PER],
    [ActorStat.MEM]: actor.stats[ActorStat.MEM],
  };

  const shellStats = getCurrentShellStats(actor);

  return {
    ...coreStats,
    ...shellStats,
  };
};

/**
 * Computed version of getEffectiveStatValue that works with the new architecture
 * @param actor - The actor to get the stat from
 * @param stat - The stat to get the effective value for
 * @returns The effective stat value
 */
export const getActorEffectiveStatValue = (actor: Actor, stat: ActorStat): number => {
  const statAttr = getActorStat(actor, stat);
  return statAttr.eff;
};

/**
 * Computed version of getNaturalStatValue that works with the new architecture
 * @param actor - The actor to get the stat from
 * @param stat - The stat to get the natural value for
 * @returns The natural stat value
 */
export const getActorNaturalStatValue = (actor: Actor, stat: ActorStat): number => {
  const statAttr = getActorStat(actor, stat);
  return statAttr.nat;
};

/**
 * Computed version of computeEffectiveStatValue that works with the new architecture
 * @param actor - The actor to compute the stat for
 * @param stat - The stat to compute
 * @returns The computed effective stat value
 */
export const computeActorEffectiveStatValue = (actor: Actor, stat: ActorStat): number => {
  const statAttr = getActorStat(actor, stat);
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
};
