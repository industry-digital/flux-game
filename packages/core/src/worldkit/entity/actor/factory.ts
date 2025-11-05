import { DEFAULT_FACTORY_DEPS, FactoryDependencies } from '../util';
import { EntityType } from '~/types/entity/entity';
import { Actor, ActorInput, Stat, ActorType, Gender } from '~/types/entity/actor';
import { WellKnownPlace } from '~/types/world/space';
import { merge } from '~/lib/lang';
import { refreshCapacitorEnergy } from '~/worldkit/entity/actor/capacitor';
import { createShell } from '~/worldkit/entity/actor/shell';
import { initializeWallet } from '~/worldkit/entity/actor/wallet';
import { createInventory } from '~/worldkit/entity/actor/inventory';

export type ActorTransformer = (actor: Actor) => Actor;

export type ActorFactoryDependencies = FactoryDependencies & {
  refreshCapacitorEnergy: typeof refreshCapacitorEnergy;
  createShell: typeof createShell;
  initializeWallet: typeof initializeWallet;
};

export const DEFAULT_ACTOR_FACTORY_DEPS: ActorFactoryDependencies = {
  ...DEFAULT_FACTORY_DEPS,
  refreshCapacitorEnergy,
  createShell,
  initializeWallet,
};

export function createActor(
  inputOrTransform?: ActorInput | ActorTransformer,
  deps: ActorFactoryDependencies = DEFAULT_ACTOR_FACTORY_DEPS,
): Actor {
  const actor = createDefaultActor(deps);

  if (typeof inputOrTransform === 'function') {
    // Input is a transformer function
    const transform = inputOrTransform as ActorTransformer;
    deps.refreshCapacitorEnergy(actor);
    deps.initializeWallet(actor);
    return transform(actor);
  }

  if (inputOrTransform) {
    // Input is ActorInput data
    const input = inputOrTransform as ActorInput;
    merge(actor, input);
  }

  // Always refresh capacitor energy and initialize wallet for the final actor
  deps.refreshCapacitorEnergy(actor);
  deps.initializeWallet(actor);

  return actor;
}

const createDefaultActor = (deps: ActorFactoryDependencies): Actor => {
  const now = deps.timestamp();
  // Create actor with empty shells first
  const actor: Actor = {
    id: `flux:actor:${deps.uniqid()}`,
    type: EntityType.ACTOR,
    name: '',
    description: {
      base: '',
    },
    gender: Gender.MALE,
    kind: ActorType.PC,
    location: WellKnownPlace.ORIGIN,
    level: 1,
    hp: {
      max: 100,
      current: 100,
    },
    traits: {},
    stats: {
      [Stat.INT]: 10,
      [Stat.PER]: 10,
      [Stat.MEM]: 10,
    },
    injuries: {},
    capacitor: {
      position: 1, // Start at full energy
      energy: {
        current: 1000,
        max: 1000,
      },
    },
    effects: {},
    inventory: createInventory(now),
    equipment: {},
    wallet: {},
    memberships: {},
    skills: {},
    standing: 0,
    currentShell: '', // Will be set after shell creation
    shells: {}, // Start empty
    session: undefined,
  };

  // Create three shells
  for (let i = 1; i <= 3; i++) {
    const shell = deps.createShell({ id: i.toString() });
    actor.shells[shell.id] = shell;
  }

  // The first shell is the default shell
  actor.currentShell = '1';

  return actor;
};
