import { createEntity, FactoryOptions, createSymbolicLink } from './util';
import { createModifiableScalarAttribute, createModifiableBoundedAttribute } from './attribute';
import { merge } from 'lodash';
import { createEntityUrn, isUrnOfVocabulary } from '~/lib/taxonomy';
import {
  AbstractEntity,
  Actor,
  ActorInput,
  ActorStat,
  ActorType,
  ActorURN,
  EntityType,
  SymbolicLink,
} from '@flux';

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
  transform: (character: Actor) => Actor = identity,
  {
    timestamp = () => Date.now(),
  }: FactoryOptions = {},
): Actor => {
  const defaults: Actor = createEntity<EntityType.ACTOR, Actor>(
    EntityType.ACTOR,
    (entity) => {
      const defaults: Partial<Actor> = {
        name: entity.name || '',
        description: entity.description || '',
        location: createSymbolicLink(EntityType.PLACE, ['nowhere']) as SymbolicLink<EntityType.PLACE>,
        level: createModifiableScalarAttribute(),
        hp: createModifiableBoundedAttribute(),
        traits: {},
        stats: {
          [ActorStat.STR]: createModifiableScalarAttribute((defaults) => ({ ...defaults, nat: 10 })),
          [ActorStat.DEX]: createModifiableScalarAttribute((defaults) => ({ ...defaults, nat: 10 })),
          [ActorStat.AGI]: createModifiableScalarAttribute((defaults) => ({ ...defaults, nat: 10 })),
          [ActorStat.CON]: createModifiableScalarAttribute((defaults) => ({ ...defaults, nat: 10 })),
          [ActorStat.INT]: createModifiableScalarAttribute((defaults) => ({ ...defaults, nat: 10 })),
          [ActorStat.WIS]: createModifiableScalarAttribute((defaults) => ({ ...defaults, nat: 10 })),
          [ActorStat.PRS]: createModifiableScalarAttribute((defaults) => ({ ...defaults, nat: 10 })),
          [ActorStat.LCK]: createModifiableScalarAttribute((defaults) => ({ ...defaults, nat: 10 })),
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
        reputation: 0,
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

export const createActorUrn = (subtype: ActorType, ...terms: string[]): ActorURN => {
  return createEntityUrn(EntityType.ACTOR, subtype, ...terms) as ActorURN;
};
