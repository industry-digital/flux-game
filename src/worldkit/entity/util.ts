import { createEntityUrn } from '~/lib/taxonomy';
import { uniqid } from '~/lib/random';
import { EntityType, AbstractEntity, Describable } from '~/types/entity/entity';
import { RootNamespace } from '~/types/taxonomy';

const identity = <T>(x: T): T => x;

export type EntityCreator<T extends EntityType, E extends AbstractEntity<T> & Describable> = (
  entity: AbstractEntity<T> & Describable,
) => E;

export type FactoryOptions = {
  now?: number;
  timestamp?: () => number;
  generateUniqueId?: () => string;
};

export const createEntity = <T extends EntityType, E extends AbstractEntity<T> & Describable>(
  type: T,
  transform: EntityCreator<T, E> = identity as EntityCreator<T, E>,
  { generateUniqueId = uniqid }: FactoryOptions = {},
): E => {
  const id = generateUniqueId();
  const urn = createEntityUrn(type, id) as `${RootNamespace}:${T}:${string}`;
  const path = [id];
  const defaults: AbstractEntity<T> & Describable = {
    type,
    id: urn,
    name: '',
    description: ''
  };

  return transform(defaults);
};
