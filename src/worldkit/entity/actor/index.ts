import { createEntity, FactoryOptions } from '../util';
import { createModifiableScalarAttribute, createModifiableBoundedAttribute } from '../attribute';
import lodash from 'lodash';
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

const { merge } = lodash;

const identity = <T>(x: T): T => x;

/**
 * Type guard for Actor
 */
export const isActor = (character: AbstractEntity<EntityType>): character is Actor => {
  return character.type === EntityType.ACTOR;
};

export const isActorUrn = (urn: string): urn is ActorURN => isUrnOfVocabulary(urn, 'actor');

export const createActor = (
  input: ActorInput,
  transform: (actor: Actor) => Actor = identity,
  {
    timestamp = () => Date.now(),
  }: FactoryOptions = {},
): Actor => {
  const defaults: Actor = createEntity<EntityType.ACTOR, Actor>(
    EntityType.ACTOR,
    (entity) => {
      const defaults: Partial<Actor> = {
        name: input.name ?? entity.name,
        description: { base: input.description ?? '' },
        kind: input.kind ?? ActorType.PC,
        location: input.location ?? WellKnownPlace.ORIGIN,
        level: createModifiableScalarAttribute(),
        hp: createModifiableBoundedAttribute(),
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
        mana: {},
        effects: {},
        inventory: {
          mass: 0,
          items: {},
          ts: timestamp(),
        },
        equipment: {},
        memberships: {},
        skills: {},
        specializations: {
          primary: {},
          secondary: {},
        },
      };

      return merge({}, entity, defaults, input) as Actor;
    },
  );

  return transform(defaults);
};

export const createActorUrn = (...terms: string[]): ActorURN => {
  return createEntityUrn(EntityType.ACTOR, ...terms) as ActorURN;
};
