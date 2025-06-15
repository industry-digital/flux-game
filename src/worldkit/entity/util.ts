import { createEntityUrn } from '~/lib/taxonomy';
import { randomUUID } from '~/lib/uuid';
import {
  EntityType,
  UUIDLike,
  RootNamespace,
  AbstractEntity,
  Describable,
  SymbolicLink,
} from '@flux';

const identity = <T>(x: T): T => x;

export type EntityCreator<T extends EntityType, E extends AbstractEntity<T> & Describable> = (
  entity: AbstractEntity<T> & Describable,
) => E;

export type FactoryOptions = {
  now?: number;
  timestamp?: () => number;
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
    path,
  };
};

export const createEntity = <T extends EntityType, E extends AbstractEntity<T> & Describable>(
  type: T,
  transform: EntityCreator<T, E> = identity as EntityCreator<T, E>,
  { uuid = randomUUID }: FactoryOptions = {},
): E => {
  const id = uuid();
  const urn = createEntityUrn(type, id) as `${RootNamespace}:${T}:${string}`;
  const path = [id];
  const defaults: AbstractEntity<T> & Describable = {
    type,
    id: urn,
    path,
    name: '',
    description: ''
  };

  return transform(defaults);
};
