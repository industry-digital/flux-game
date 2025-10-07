import { Shell } from '~/types/entity/shell';
import { Actor } from '~/types/entity/actor';
import { Stat, ShellStats } from '~/types/entity/actor';
import { createModifiableScalarAttribute } from '~/worldkit/entity';
import { createInventory } from '~/worldkit/entity/actor/inventory';
import { hashUnsafeString } from '~/worldkit/hash';
import { PotentiallyImpureOperations } from '~/types';
import { generateRandomShellName } from './name';

// Re-export for testing
export { generateRandomShellName };

export const addShellToActor = (actor: Actor, shell: Shell = createShell()) => {
  actor.shells[shell.id] = shell;
};

export const removeShellFromActor = (actor: Actor, shellId: string) => {
  delete actor.shells[shellId];
};

export const getShellFromActor = (actor: Actor, shellId: string) => {
  return actor.shells[shellId];
};

export const getShellsFromActor = (actor: Actor) => {
  return actor.shells;
};

/**
 * Find shell by exact ID or fuzzy name match
 */
export const findShellByNameOrId = (actor: Actor, input: string): { shell: any; id: string } | null => {
  // Try exact ID first
  if (actor.shells[input]) {
    return { shell: actor.shells[input], id: input };
  }

  // Try fuzzy name matching
  for (const [shellId, shell] of Object.entries(actor.shells)) {
    if (shell.name?.toLowerCase().includes(input.toLowerCase())) {
      return { shell, id: shellId };
    }
  }

  return null;
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
    [Stat.POW]: createModifiableScalarAttribute((defaults) => ({ ...defaults, nat: 10 })),
    [Stat.FIN]: createModifiableScalarAttribute((defaults) => ({ ...defaults, nat: 10 })),
    [Stat.RES]: createModifiableScalarAttribute((defaults) => ({ ...defaults, nat: 10 })),
  };

  const defaults: Shell = {
    id: input?.id ?? deps.hashUnsafeString(name),
    name,
    stats: input?.stats ? { ...defaultStats, ...input.stats } : defaultStats,
    inventory: input?.inventory ?? deps.createInventory(deps.timestamp()),
    equipment: {},
  };

  return transform(defaults) as Shell;
};

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
    stats[Stat.POW].nat = input[Stat.POW]!;
    stats[Stat.POW].eff = input[Stat.POW]!;
    delete stats[Stat.POW].mods;
  }

  if (input[Stat.FIN] !== undefined) {
    stats[Stat.FIN].nat = input[Stat.FIN]!;
    stats[Stat.FIN].eff = input[Stat.FIN]!;
    delete stats[Stat.FIN].mods;
  }

  if (input[Stat.RES] !== undefined) {
    stats[Stat.RES].nat = input[Stat.RES]!;
    stats[Stat.RES].eff = input[Stat.RES]!;
    delete stats[Stat.RES].mods;
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
  if (!attr) {
    throw new Error(`Shell does not have stat ${stat}`);
  }
  return attr.eff;
};

/**
 * Helper function to get natural stat value from a shell
 */
export const getShellNaturalStatValue = (shell: Shell, stat: ShellStatKey): number => {
  const attr = shell.stats[stat];
  if (!attr) {
    throw new Error(`Shell does not have stat ${stat}`);
  }
  return attr.nat;
};

/**
 * Helper function to set effective stat value on a shell
 * Useful for mutations and test setup
 */
export const setShellStatValue = (shell: Shell, stat: ShellStatKey, value: number): void => {
  const attr = shell.stats[stat];
  if (!attr) {
    throw new Error(`Shell does not have stat ${stat}`);
  }
  attr.eff = value;
};

/**
 * Helper function to set natural stat value on a shell
 * Useful for mutations and test setup
 */
export const setShellNaturalStatValue = (shell: Shell, stat: ShellStatKey, value: number): void => {
  const attr = shell.stats[stat];
  if (!attr) {
    throw new Error(`Shell does not have stat ${stat}`);
  }
  attr.nat = value;
};

/**
 * Refresh shell stats by recalculating effective values from natural + modifiers
 * This is a simplified version for shells only
 */
export const refreshShellStats = (shell: Shell, statNames?: readonly ShellStatKey[]): void => {
  const statsToRefresh = statNames || [Stat.POW, Stat.FIN, Stat.RES];

  for (const stat of statsToRefresh) {
    const attr = shell.stats[stat];
    if (attr) {
      // Simple refresh: for shells, we typically just copy nat to eff
      // In a more complex system, this would apply modifiers
      attr.eff = attr.nat;
    }
  }
};
