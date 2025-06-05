import { EntityType, AbstractEntity } from '~/types/entity/entity';
import { EntityURN } from '~/types/taxonomy';

/**
 * Create a base entity from a URN string
 */
export function createBaseEntity<T extends EntityType>(urn: EntityURN<T>): AbstractEntity<T> {
  const [namespace, type, ...parts] = urn.split(':');
  if (namespace !== 'flux' || !type) {
    throw new Error(`Invalid URN format: ${urn}`);
  }
  if (!Object.values(EntityType).includes(type as EntityType)) {
    throw new Error(`Unknown entity type: ${type}`);
  }

  return {
    type: type as T,
    id: urn,
    path: parts,
  };
}
