import { DEFAULT_FACTORY_DEPS, FactoryDependencies } from '../util';
import { createModifiableScalarAttribute, createModifiableBoundedAttribute } from '../attribute';
import { createEntityUrn, isUrnOfVocabulary } from '~/lib/taxonomy';
import { AbstractEntity, EntityType } from '~/types/entity/entity';
import {
  Actor,
  ActorInput,
  Stat,
  ActorType,
} from '~/types/entity/actor';
import { ActorURN } from '~/types/taxonomy';
import { WellKnownPlace } from '~/types/world/space';
import { merge } from '~/lib/lang';
import { refreshCapacitorEnergy } from '~/worldkit/entity/actor/capacitor';
import { createShell } from '~/worldkit/entity/actor/shell';
import { initializeWallet } from '~/worldkit/entity/actor/wallet';

export type ActorTransformer = (actor: Actor) => Actor;
const identity: ActorTransformer = (actor: Actor) => actor;

/**
 * Type guard for Actor
 */
export const isActor = (character: AbstractEntity<EntityType>): character is Actor => {
  return character.type === EntityType.ACTOR;
};

export const isActorUrn = (urn: string): urn is ActorURN => isUrnOfVocabulary(urn, 'actor');

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

export function createActor(): Actor;
export function createActor(input: ActorInput, deps?: ActorFactoryDependencies): Actor;
export function createActor(transform: ActorTransformer, deps?: ActorFactoryDependencies): Actor;

export function createActor(
  inputOrTransform?: ActorInput | ActorTransformer | undefined,
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
};

const createDefaultActor = (deps: ActorFactoryDependencies): Actor => {
  const defaultShell = deps.createShell();
  return {
    id: `flux:actor:${deps.uniqid()}`,
    type: EntityType.ACTOR,
    name: '',
    description: { base: '' },
    kind: ActorType.PC,
    location: WellKnownPlace.ORIGIN,
    level: createModifiableScalarAttribute((defaults) => ({ ...defaults, nat: 1, eff: 1, mods: {} })),
    hp: createModifiableBoundedAttribute((
      (defaults) => ({ ...defaults, nat: { cur: 100, max: 100 }, eff: { cur: 100, max: 100 }, mods: {} })),
    ),
    traits: {},
    stats: {
      [Stat.INT]: createModifiableScalarAttribute((defaults) => ({ ...defaults, nat: 10 })),
      [Stat.PER]: createModifiableScalarAttribute((defaults) => ({ ...defaults, nat: 10 })),
      [Stat.MEM]: createModifiableScalarAttribute((defaults) => ({ ...defaults, nat: 10 })),
    },
    injuries: {},
    capacitor: {
      position: 1, // Start at full energy
      energy: { nat: { cur: 0, max: 0 }, eff: { cur: 0, max: 0 }, mods: {} },
    },
    effects: {},
    inventory: {
      mass: 0,
      items: {},
      ts: deps.timestamp(),
    },
    equipment: {},
    wallet: {},
    memberships: {},
    skills: {},
    standing: 0,
    specializations: {
      primary: {},
      secondary: {},
    },
    currentShell: defaultShell.id,
    shells: {
      [defaultShell.id]: defaultShell,
    },
    sessions: {},
  };
};

export const createActorUrn = (...terms: string[]): ActorURN => {
  return createEntityUrn(EntityType.ACTOR, ...terms) as ActorURN;
};

export const isActorAlive = (actor: Actor) => actor.hp.eff.cur > 0;

export { createActorCapacitorApi } from './capacitor';
export { createActorInventoryApi, type ActorInventoryApi } from './inventory';
export { createActorEquipmentApi, type ActorEquipmentApi } from './equipment';

export * from './health';
export * from './skill';
export * from './wallet';
export * from './new-stats';
export * from './shell';
