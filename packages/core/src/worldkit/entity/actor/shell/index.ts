import { Shell } from '~/types/entity/shell';
import { Actor } from '~/types/entity/actor';
import { Stat, ShellStats } from '~/types/entity/actor';
import { createModifiableScalarAttribute } from '~/worldkit/entity';
import { createInventory } from '~/worldkit/entity/actor/inventory';
import { hashUnsafeString } from '~/worldkit/hash';

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


export type CreateShellInput = {
  id?: Shell['id'];
  name?: Shell['name'];
  inventory?: Shell['inventory'];
  equipment?: Shell['equipment'];
  stats?: ShellStats;
};

export type ShellTransformer = (shell: Shell) => Shell;
const identity: ShellTransformer = (shell: Shell) => shell;

export type CreateShellDependencies = {
  hashUnsafeString: typeof hashUnsafeString;
  createInventory: typeof createInventory;
};

export const DEFAULT_CREATE_SHELL_DEPS: CreateShellDependencies = {
  hashUnsafeString,
  createInventory,
};

export function createShell(input: CreateShellInput, transform?: ShellTransformer, deps?: CreateShellDependencies): Shell;
export function createShell(transform: ShellTransformer, deps?: CreateShellDependencies): Shell;
export function createShell(deps?: CreateShellDependencies): Shell;

export function createShell(
  inputOrTransformOrDeps?: CreateShellInput | ShellTransformer | CreateShellDependencies,
  transformOrDeps?: ShellTransformer | CreateShellDependencies,
  deps: CreateShellDependencies = DEFAULT_CREATE_SHELL_DEPS,
): Shell {
  // Determine the actual arguments based on types
  let input: CreateShellInput | undefined;
  let transform: ShellTransformer = identity;

  // Case 1: createShell(transform) - first arg is function
  if (typeof inputOrTransformOrDeps === 'function') {
    transform = inputOrTransformOrDeps;
    deps = (transformOrDeps as CreateShellDependencies) ?? DEFAULT_CREATE_SHELL_DEPS;
  }
  // Case 2: createShell(deps) - first arg is deps object
  else if (inputOrTransformOrDeps && 'hashUnsafeString' in inputOrTransformOrDeps) {
    deps = inputOrTransformOrDeps;
  }
  // Case 3: createShell(input, transform?, deps?) - first arg is input object or undefined
  else {
    input = inputOrTransformOrDeps as CreateShellInput | undefined;
    if (typeof transformOrDeps === 'function') {
      transform = transformOrDeps;
      deps = deps ?? DEFAULT_CREATE_SHELL_DEPS;
    } else if (transformOrDeps) {
      deps = transformOrDeps;
    }
  }

  const {
    hashUnsafeString: hashUnsafeStringImpl,
    createInventory: createInventoryImpl,
  } = deps;
  const name = input?.name ?? generateRandomShellName();

  const defaults: Shell = {
    id: input?.id ?? hashUnsafeStringImpl(name),
    name,
    stats: input?.stats ?? {
      [Stat.POW]: createModifiableScalarAttribute((defaults) => ({ ...defaults, nat: 10 })),
      [Stat.FIN]: createModifiableScalarAttribute((defaults) => ({ ...defaults, nat: 10 })),
      [Stat.RES]: createModifiableScalarAttribute((defaults) => ({ ...defaults, nat: 10 })),
    },
    inventory: input?.inventory ?? createInventoryImpl(),
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

const SHELL_NAME_ADJECTIVES = [
  'Impetuous',
  'Nimble',
  'Rapid',
  'Swift',
  'Agile',
  'Lethal',
  'Deadly',
  'Ruthless',
  'Ferocious',
  'Violent',
  'Ruthless',
  'Ferocious',
  'Violent',
  'Ruthless',
];

const SHELL_NAME_NOUNS = [
  'Bolt',
  'Bullet',
  'Eagle',
  'Falcon',
  'Hawk',
  'Jackdaw',
  'Osprey',
  'Otter',
  'Owl',
  'Vulture',
  'Wolf',
  'Bear',
  'Lion',
  'Tiger',
  'Leopard',
  'Panther',
  'Jaguar',
  'Cheetah',
  'Fox',
  'Dog',
  'Cat',
  'Mouse',
  'Rat',
  'Squirrel',
];

export const generateRandomShellName = (
  random = () => Math.random(),
): string => {
  const randomNumber = Math.floor(random() * 1000);
  const adjective = SHELL_NAME_ADJECTIVES[Math.floor(random() * SHELL_NAME_ADJECTIVES.length)];
  const noun = SHELL_NAME_NOUNS[Math.floor(random() * SHELL_NAME_NOUNS.length)];
  return `${adjective}${noun}${randomNumber}`;
};
