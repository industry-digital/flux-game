import { createEntityUrn } from '~/lib/taxonomy';
import { uniqid } from '~/lib/random';
import { EntityType, AbstractEntity, Describable } from '~/types/entity/entity';
import { RootNamespace } from '~/types/taxonomy';
import { PotentiallyImpureOperations } from '~/types/handler';
import { DEFAULT_POTENTIALLY_IMPURE_OPERATIONS } from '~/worldkit/context';

const identity = <T>(x: T): T => x;

export type EntityCreator<T extends EntityType, E extends AbstractEntity<T> & Describable> = (
  entity: AbstractEntity<T> & Describable,
) => E;

export type FactoryDependencies = Pick<PotentiallyImpureOperations, 'timestamp' | 'uniqid' | 'random'>;

export const DEFAULT_ACTOR_FACTORY_OPTIONS: FactoryDependencies = {...DEFAULT_POTENTIALLY_IMPURE_OPERATIONS};

export const createEntity = <T extends EntityType, E extends AbstractEntity<T> & Describable>(
  type: T,
  transform: EntityCreator<T, E> = identity as EntityCreator<T, E>,
  { uniqid: uniqidImpl = uniqid }: FactoryDependencies = DEFAULT_ACTOR_FACTORY_OPTIONS,
): E => {
  const id = uniqidImpl();
  const urn = createEntityUrn(type, id) as `${RootNamespace}:${T}:${string}`;
  const defaults: AbstractEntity<T> & Describable = {
    type,
    id: urn,
    name: '',
    description: { base: '', emergent: '' },
  };

  return transform(defaults);
};
