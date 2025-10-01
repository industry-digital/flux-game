import { Shell } from '~/types/entity/shell';
import { Actor } from '~/types/entity/actor';
import { ActorStat, ShellStats } from '~/types/entity/actor';
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
  createModifiableScalarAttribute: typeof createModifiableScalarAttribute;
  createInventory: typeof createInventory;
};

export const DEFAULT_CREATE_SHELL_DEPS: CreateShellDependencies = {
  hashUnsafeString,
  createModifiableScalarAttribute,
  createInventory,
};

export const createShell = (
  input?: CreateShellInput,
  transform = identity,
  {
    hashUnsafeString: hashUnsafeStringImpl,
    createModifiableScalarAttribute: createModifiableScalarAttributeImpl,
    createInventory: createInventoryImpl,
  }: CreateShellDependencies = DEFAULT_CREATE_SHELL_DEPS,
): Shell => {
  const name = input?.name ?? generateRandomShellName();

  const defaults: Shell = {
    id: input?.id ?? hashUnsafeStringImpl(name),
    name,
    stats: {
      [ActorStat.POW]: createModifiableScalarAttributeImpl((defaults) => ({ ...defaults, nat: 10 })),
      [ActorStat.FIN]: createModifiableScalarAttributeImpl((defaults) => ({ ...defaults, nat: 10 })),
      [ActorStat.RES]: createModifiableScalarAttributeImpl((defaults) => ({ ...defaults, nat: 10 })),
    },
    inventory: input?.inventory ?? createInventoryImpl(),
    equipment: {},
  };

  return transform(defaults) as Shell;
};

export type ShellStatsInput = Partial<{
  [ActorStat.POW]: number;
  [ActorStat.FIN]: number;
  [ActorStat.RES]: number;
}>;

/**
 * Apply stat changes to shell stats (immutable update)
 * Returns a new ShellStats object with updated values
 */
export const applyShellStats = (stats: ShellStats, input: ShellStatsInput): ShellStats => {
  const newStats = { ...stats };

  if (input[ActorStat.POW] !== undefined) {
    newStats[ActorStat.POW] = {
      ...newStats[ActorStat.POW],
      nat: input[ActorStat.POW]!,
      eff: input[ActorStat.POW]!,
    };

    delete newStats[ActorStat.POW].mods;
  }

  if (input[ActorStat.FIN] !== undefined) {
    newStats[ActorStat.FIN] = {
      ...newStats[ActorStat.FIN],
      nat: input[ActorStat.FIN]!,
      eff: input[ActorStat.FIN]!,
    };

    delete newStats[ActorStat.FIN].mods;
  }

  if (input[ActorStat.RES] !== undefined) {
    newStats[ActorStat.RES] = {
      ...newStats[ActorStat.RES],
      nat: input[ActorStat.RES]!,
      eff: input[ActorStat.RES]!,
    };

    delete newStats[ActorStat.RES].mods;
  }

  return newStats;
};

/**
 * Create a new shell with updated stats (immutable)
 */
export const setShellStats = (shell: Shell, input: ShellStatsInput): Shell => {
  return {
    ...shell,
    stats: applyShellStats(shell.stats, input),
  };
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
