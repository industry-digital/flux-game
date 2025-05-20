import { Character, Entity, EntityType, Taxonomy, createEntityUrn, identity } from '~/types/domain';
import { EffectType } from '~/lib/character/effects';
import { randomUUID } from '~/lib/uuid';

export type EntityEnvelopeTransformer = (entity: EntityEnvelope) => EntityEnvelope

export type EntityEnvelope = Omit<Entity, 'type' | 'attributes'>;

export const createEntityEnvelope = <
T extends EntityType,
> (
  type: T,
  transform: EntityEnvelopeTransformer = identity,
  now = Date.now(),
): EntityEnvelope => {
  return transform({
    id: createEntityUrn<T>(type, randomUUID()),
    name: '',
    description: '',
    createdAt: now,
    updatedAt: now,
    version: 0,
  });
};

export const isCharacter = (character: Entity): character is Character => {
  return character.type.startsWith(Taxonomy.Vocabulary.CHARACTER);
};

export const isCharacterImmobilized = (character: Character): boolean => {
  const { effects = {} } = character.attributes;
  return Object.values(effects).some(({ type }) => type === EffectType.IMMOBILIZED);
};
