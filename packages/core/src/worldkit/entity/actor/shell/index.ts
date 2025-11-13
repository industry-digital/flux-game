import { Shell } from '~/types/entity/shell';
import { Actor } from '~/types/entity/actor';
import { Stat, ShellStats } from '~/types/entity/actor';
import { createInventory } from '~/worldkit/entity/actor/inventory';
import { hashUnsafeString } from '~/worldkit/hash';
import { PotentiallyImpureOperations } from '~/types';
import { generateRandomShellName } from './name';
import { MAX_STAT_VALUE } from '~/worldkit/entity/actor/stats';

/**
 * Shell stat keys - the stats that are stored on shells
 */
export const SHELL_STAT_KEYS = [Stat.POW, Stat.FIN, Stat.RES] as const;

/**
 * Sync shell stats to actor stats (PC only)
 * This maintains the invariant that actor.stats reflects the current shell's stats
 *
 * For PCs: actor.stats.{pow,fin,res} is a materialized view of shells[currentShell].stats
 * This should be called at:
 * - Shell swap
 * - Shell mutation commit
 * - Actor creation/hydration
 */
export const syncShellStatsToActor = (actor: Actor): void => {
  if (!actor.currentShell || !actor.shells) {
    // Creature or actor without shells - no sync needed
    return;
  }

  const currentShell = actor.shells[actor.currentShell];
  if (!currentShell) {
    throw new Error(`Cannot sync stats: current shell ${actor.currentShell} not found`);
  }

  // Sync shell stats to actor (materialized view pattern)
  actor.stats[Stat.POW] = currentShell.stats[Stat.POW];
  actor.stats[Stat.FIN] = currentShell.stats[Stat.FIN];
  actor.stats[Stat.RES] = currentShell.stats[Stat.RES];
};

// Re-export for testing
export { generateRandomShellName };

const computeHighestShellId = (actor: Actor): number => {
  let highestShellId = 0;
  for (const shellIdString in actor.shells) {
    const shellId = parseInt(shellIdString, 10);
    if (shellId > highestShellId) {
      highestShellId = shellId;
    }
  }

  return highestShellId;
};

/**
 * Create a shell with a sequential ID for the given actor
 * The ID will be the next integer in sequence (1, 2, 3, etc.)
 */
export const createSequentialShell = (
  actor: Actor,
  inputOrTransform?: ShellInput | ShellTransformer,
  deps: ShellFactoryDependencies = DEFAULT_SHELL_FACTORY_DEPS,
): Shell => {
  const nextShellId = (computeHighestShellId(actor) + 1).toString();

  // Handle the input/transform pattern like createShell
  let input: ShellInput | undefined;
  let transform: ShellTransformer = identity;

  if (typeof inputOrTransform === 'function') {
    transform = inputOrTransform as ShellTransformer;
  } else if (inputOrTransform) {
    input = inputOrTransform as ShellInput;
  }

  // Merge the sequential ID with any provided input
  const shellInput: ShellInput = {
    ...input,
    id: nextShellId, // Always use sequential ID
  };

  const shell = createShell(shellInput, deps);
  return transform(shell);
};


export const addShellToActor = (actor: Actor, shell?: Shell) => {
  // If no shell provided, create a new one with sequential ID
  if (!shell) {
    shell = createSequentialShell(actor);
  }

  actor.shells![shell.id] = shell;
};

export const removeShellFromActor = (actor: Actor, shellId: string) => {
  delete actor.shells?.[shellId];
};

export const getShell = (actor: Actor, shellId: string) => {
  return actor.shells?.[shellId];
};

export const getCurrentShell = (actor: Actor) => {
  return actor.shells![actor.currentShell!];
};

export const getShellsFromActor = (actor: Actor) => {
  return actor.shells;
};

export type ShellInput = {
  id?: Shell['id'];
  name?: Shell['name'];
  inventory?: Shell['inventory'];
  equipment?: Shell['equipment'];
  stats?: Partial<ShellStats>;
};

export type ShellTransformer = (shell: Shell) => Shell;
const identity: ShellTransformer = (shell: Shell) => shell;

export type ShellFactoryDependencies = {
  hashUnsafeString: typeof hashUnsafeString;
  createInventory: typeof createInventory;
  generateRandomShellName: typeof generateRandomShellName;
  timestamp: PotentiallyImpureOperations['timestamp'],
};

export const DEFAULT_SHELL_FACTORY_DEPS: ShellFactoryDependencies = {
  hashUnsafeString,
  createInventory,
  generateRandomShellName,
  timestamp: () => Date.now(),
};

export function createShell(
  inputOrTransform?: ShellInput | ShellTransformer,
  deps: ShellFactoryDependencies = DEFAULT_SHELL_FACTORY_DEPS,
): Shell {
  // Determine the actual arguments based on types - same pattern as createActor
  let input: ShellInput | undefined;
  let transform: ShellTransformer = identity;

  if (typeof inputOrTransform === 'function') {
    // Input is a transformer function
    transform = inputOrTransform as ShellTransformer;
  } else if (inputOrTransform) {
    // Input is CreateShellInput data
    input = inputOrTransform as ShellInput;
  }

  const name = input?.name ?? deps.generateRandomShellName();

  const defaultStats = {
    [Stat.POW]: 10,
    [Stat.FIN]: 10,
    [Stat.RES]: 10,
  };

  const defaults: Shell = {
    id: input?.id ?? deps.hashUnsafeString(name),
    name,
    stats: input?.stats ? { ...defaultStats, ...input.stats } : defaultStats,
    inventory: input?.inventory ?? deps.createInventory(deps.timestamp()),
    equipment: {},
  };

  return transform(defaults) as Shell;
}

export type ShellStatsInput = Partial<{
  [Stat.POW]: number;
  [Stat.FIN]: number;
  [Stat.RES]: number;
}>;

/**
 * Directly mutate the shell stats in place (zero-allocation)
 */
export const mutateShellStats = (stats: ShellStats, input: ShellStatsInput): void => {
  if (input[Stat.POW] !== undefined) {
    stats[Stat.POW] = input[Stat.POW]!;
  }

  if (input[Stat.FIN] !== undefined) {
    stats[Stat.FIN] = input[Stat.FIN]!;
  }

  if (input[Stat.RES] !== undefined) {
    stats[Stat.RES] = input[Stat.RES]!;
  }
};

/**
 * Apply stat changes to shell stats (shallow copy with mutation)
 * Returns a shallow copy of the stats object with mutated stat values
 * Uses zero-allocation mutation internally for performance
 */
export const applyShellStats = (stats: ShellStats, input: ShellStatsInput): ShellStats => {
  const newStats = { ...stats }; // Shallow copy (1 allocation)
  mutateShellStats(newStats, input); // Mutate stat objects in place (0 allocations)
  return newStats;
};

/**
 * Create a deep copy of a shell for cases where immutability is required
 * Use this when you need to preserve the original shell completely unchanged
 *
 * Uses JSON serialization for simplicity and correctness (handles arbitrary nesting)
 * Performance is not a concern as this is only used at the workbench (~1x per hour, per player)
 */
export const cloneShell = (shell: Shell): Shell => {
  return JSON.parse(JSON.stringify(shell));
};

type ShellStatKey = Stat.POW | Stat.FIN | Stat.RES;

/**
 * Helper function to get effective stat value from a shell
 * This provides a consistent interface for shell stat access
 */
export const getShellStatValue = (shell: Shell, stat: ShellStatKey): number => {
  const attr = shell.stats[stat];
  if (attr === undefined) {
    throw new Error(`Shell does not have stat ${stat}`);
  }
  return attr;
};

/**
 * Helper function to get natural stat value from a shell
 */
export const getShellNaturalStatValue = (shell: Shell, stat: ShellStatKey): number => {
  const attr = shell.stats[stat];
  if (attr === undefined) {
    throw new Error(`Shell does not have stat ${stat}`);
  }
  return attr;
};

/**
 * Helper function to set effective stat value on a shell
 * Useful for mutations and test setup
 */
export const setShellStatValue = (shell: Shell, stat: ShellStatKey, value: number): void => {
  if (value < 0) {
    value = 0;
  } else if (value > MAX_STAT_VALUE) {
    value = MAX_STAT_VALUE;
  }

  shell.stats[stat] = value;
};

/**
 * Helper function to set natural stat value on a shell
 * Useful for mutations and test setup
 * @deprecated Use setShellStatValue instead
 */
export const setShellNaturalStatValue = (shell: Shell, stat: ShellStatKey, value: number): void => {
  setShellStatValue(shell, stat, value);
};
