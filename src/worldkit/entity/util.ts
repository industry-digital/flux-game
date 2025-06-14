import { createEntityUrn } from '~/lib/taxonomy';
import { randomUUID } from '~/lib/uuid';
import { Character, EntityType, Place, PlaceURN, UUIDLike, RootNamespace } from '@flux';
import { AbstractEntity, DescribableMixin, SymbolicLink } from '~/types/entity/entity';
import { PlaceInput } from '~/types/entity/place';
import { createPlace } from '~/worldkit/entity/place';
import { createTranslationUrn, Translatable } from '~/i18n';

const identity = <T>(x: T): T => x;

export const isCharacter = (character: AbstractEntity<EntityType>): character is Character => {
  return character.type === EntityType.CHARACTER;
};

export type EntityCreator<T extends EntityType, E extends AbstractEntity<T> & DescribableMixin> = (
  entity: AbstractEntity<T> & DescribableMixin,
) => E;

export type FactoryOptions = {
  now?: number;
  uuid?: () => UUIDLike;
};

/**
 * Convert a URN string to a SymbolicLink
 */
export const createSymbolicLink = <T extends EntityType>(type: T, path: readonly string[]): SymbolicLink<T> => {
  // Create a mutable copy of the path for use with createEntityUrn
  const mutablePath = Array.from(path);
  return {
    type,
    id: createEntityUrn(type, ...mutablePath),
    path // Keep the original readonly path for the SymbolicLink
  };
};

export const createEntity = <T extends EntityType, E extends AbstractEntity<T> & DescribableMixin>(
  type: T,
  transform: EntityCreator<T, E> = identity as EntityCreator<T, E>,
  { uuid = randomUUID }: FactoryOptions = {},
): E => {
  const id = uuid();
  const urn = createEntityUrn(type, id) as `${RootNamespace}:${T}:${string}`;
  const path = [id];
  const defaults: AbstractEntity<T> & DescribableMixin = {
    type,
    id: urn,
    path,
    name: '',
    description: ''
  };

  return transform(defaults);
};
