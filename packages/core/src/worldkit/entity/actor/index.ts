import { createEntity, DEFAULT_ACTOR_FACTORY_OPTIONS, FactoryDependencies } from '../util';
import { createModifiableScalarAttribute, createModifiableBoundedAttribute } from '../attribute';
import { createEntityUrn, isUrnOfVocabulary } from '~/lib/taxonomy';
import { AbstractEntity, EntityType } from '~/types/entity/entity';
import {
  Actor,
  ActorInput,
  ActorStat,
  ActorType,
} from '~/types/entity/actor';
import { ActorURN } from '~/types/taxonomy';
import { WellKnownPlace } from '~/types/world/space';
import merge from 'lodash/merge';
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

export type CreateActorDependencies = FactoryDependencies & {
  refreshCapacitorEnergy: (actor: Actor) => void;
};

export const DEFAULT_CREATE_ACTOR_DEPS: CreateActorDependencies = {
  ...DEFAULT_ACTOR_FACTORY_OPTIONS,
  refreshCapacitorEnergy: refreshCapacitorEnergy,
};

export function createActor(
  input: ActorInput,
  transform: ActorTransformer = identity,
  deps: CreateActorDependencies = DEFAULT_CREATE_ACTOR_DEPS,
): Actor {
  const defaultShell = createShell();
  const defaults: Actor = createEntity<EntityType.ACTOR, Actor>(
    EntityType.ACTOR,
    (entity) => {
      const defaults: Partial<Actor> = {
        name: input.name ?? entity.name,
        description: { base: input.description ?? '' },
        kind: input.kind ?? ActorType.PC,
        location: input.location ?? WellKnownPlace.ORIGIN,
        level: createModifiableScalarAttribute((defaults) => ({ ...defaults, nat: 1, eff: 1, mods: {} })),
        hp: createModifiableBoundedAttribute((
          (defaults) => ({ ...defaults, nat: { cur: 100, max: 100 }, eff: { cur: 100, max: 100 }, mods: {} })),
        ),
        traits: {},
        stats: {
          [ActorStat.POW]: createModifiableScalarAttribute((defaults) => ({ ...defaults, nat: 10 })),
          [ActorStat.FIN]: createModifiableScalarAttribute((defaults) => ({ ...defaults, nat: 10 })),
          [ActorStat.RES]: createModifiableScalarAttribute((defaults) => ({ ...defaults, nat: 10 })),
          [ActorStat.INT]: createModifiableScalarAttribute((defaults) => ({ ...defaults, nat: 10 })),
          [ActorStat.PER]: createModifiableScalarAttribute((defaults) => ({ ...defaults, nat: 10 })),
          [ActorStat.MEM]: createModifiableScalarAttribute((defaults) => ({ ...defaults, nat: 10 })),
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
        specializations: {
          primary: {},
          secondary: {},
        },
        currentShell: defaultShell.id,
        shells: {
          [defaultShell.id]: defaultShell,
        },
      };

      const merged = merge({}, entity, defaults, input) as Actor;
      deps.refreshCapacitorEnergy(merged);
      initializeWallet(merged);
      return merged;
    },
  );

  return transform(defaults);
};

export const createActorUrn = (...terms: string[]): ActorURN => {
  return createEntityUrn(EntityType.ACTOR, ...terms) as ActorURN;
};

export const isActorAlive = (actor: Actor) => actor.hp.eff.cur > 0;

export { createActorCapacitorApi } from './capacitor';
export { createActorInventoryApi, type ActorInventoryApi } from './inventory';
export { createActorEquipmentApi, type ActorEquipmentApi } from './equipment';
export * from './health';
export * from './stats';
export * from './skill';
export * from './wallet';
