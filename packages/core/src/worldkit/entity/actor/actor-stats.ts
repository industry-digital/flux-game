import { Stat } from '~/types/entity/actor';
import { Actor } from '~/types/entity/actor';
import { ShellStats } from '~/types/entity/actor';
import { CoreStats } from '~/types/entity/actor';
import { ActorStats } from '~/types/entity/actor';
import { ModifiableScalarAttribute } from '~/types/entity/attribute';
import { getStat, BASELINE_STAT_VALUE, MAX_STAT_VALUE } from '../stats';

export const ALL_STAT_NAMES = Object.values(Stat);
export const CORE_STAT_NAMES = [Stat.INT, Stat.PER, Stat.MEM] as const;
export const SHELL_STAT_NAMES = [Stat.POW, Stat.FIN, Stat.RES] as const;

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
export const getActorStat = (actor: Actor, stat: Stat): ModifiableScalarAttribute => {
  if (stat === Stat.INT || stat === Stat.PER || stat === Stat.MEM) {
    return getStat(actor, stat);
  }

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
    [Stat.INT]: actor.stats[Stat.INT],
    [Stat.PER]: actor.stats[Stat.PER],
    [Stat.MEM]: actor.stats[Stat.MEM],
  };

  const shellStats = getCurrentShellStats(actor);

  return {
    ...coreStats,
    ...shellStats,
  };
};

/**
 * Get the effective value of a specific stat from an actor
 * @param actor - The actor to get the stat from
 * @param stat - The stat to get the effective value for
 * @returns The effective stat value
 */
export const getActorEffectiveStatValue = (actor: Actor, stat: Stat): number => {
  const statAttr = getActorStat(actor, stat);
  return statAttr.eff;
};

/**
 * Get the natural value of a specific stat from an actor
 * @param actor - The actor to get the stat from
 * @param stat - The stat to get the natural value for
 * @returns The natural stat value
 */
export const getActorNaturalStatValue = (actor: Actor, stat: Stat): number => {
  const statAttr = getActorStat(actor, stat);
  return statAttr.nat;
};

/**
 * Compute the effective stat value for an actor, applying modifiers
 * @param actor - The actor to compute the stat for
 * @param stat - The stat to compute
 * @returns The computed effective stat value
 */
export const computeActorEffectiveStatValue = (actor: Actor, stat: Stat): number => {
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

/**
 * Refresh the stats for an actor, handling both core and shell stats
 * This operation directly mutates the supplied actor
 * @param actor - The actor to refresh stats for
 * @param statNames - Optional array of specific stats to refresh (defaults to all stats)
 */
export const refreshActorStats = (
  actor: Actor,
  statNames?: readonly Stat[],
): void => {
  const statsToRefresh = statNames || ALL_STAT_NAMES;

  for (const stat of statsToRefresh) {
    const statAttr = getActorStat(actor, stat);
    const modifiers = statAttr.mods ?? {};
    const effectiveValue = computeActorEffectiveStatValue(actor, stat);

    statAttr.eff = effectiveValue;
    statAttr.mods = modifiers;
  }
};
