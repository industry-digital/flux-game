import { createEntityUrn, isUrnOfVocabulary } from '~/lib/taxonomy';
import { AbstractEntity, EntityType } from '~/types/entity/entity';
import { Actor } from '~/types/entity/actor';
import { ActorURN } from '~/types/taxonomy';
import { getCurrentHp } from '~/worldkit/entity/actor/health';

export type ActorTransformer = (actor: Actor) => Actor;

/**
 * Type guard for Actor
 */
export const isActor = (character: AbstractEntity<EntityType>): character is Actor => {
  return character.type === EntityType.ACTOR;
};

export const isActorUrn = (urn: string): urn is ActorURN => isUrnOfVocabulary(urn, 'actor');

export const createActorUrn = (...terms: string[]): ActorURN => {
  return createEntityUrn(EntityType.ACTOR, ...terms) as ActorURN;
};

export const isActorAlive = (actor: Actor) => getCurrentHp(actor) > 0;

export { createActorCapacitorApi } from './capacitor';
export { createActorInventoryApi, type ActorInventoryApi } from './inventory';
export { createActorEquipmentApi, type ActorEquipmentApi } from './equipment';

export * from './factory';
export * from './health';
export * from './skill';
export * from './wallet';
export * from './stats';
export * from './shell';
export * from './capacitor';
