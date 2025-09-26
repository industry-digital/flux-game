import { EntityType } from '~/types/entity/entity';
import { EntityURN, ROOT_NAMESPACE } from '~/types/taxonomy';
import { AbstractEntity } from '~/types/entity/entity';

export type ParsedURN<T extends EntityType = EntityType> = {
  type: T;
  key: string;
  path: string[];
  urn: EntityURN<T>;
};

export const parseEntityUrn = <T extends EntityType = EntityType>(urn: string): ParsedURN<T> | null => {
  const matches = urn.match(new RegExp(`^${ROOT_NAMESPACE}:([^:]+):(.+)$`));
  if (!matches) {
    return null;
  }

  const [, typeStr, key] = matches;

  // Validate that the type is a valid EntityType
  if (!Object.values(EntityType).includes(typeStr as EntityType)) {
    return null;
  }

  const type = typeStr as T;
  const path = key.split(':');

  return {
    type,
    key,
    path,
    urn: urn as EntityURN<T>
  };
};

export const parseEntityUrnOrFail = <T extends EntityType = EntityType>(urn: string): ParsedURN<T> => {
  const parsed = parseEntityUrn<T>(urn);
  if (!parsed) {
    throw new Error(`Invalid entity URN: ${urn}`);
  }
  return parsed;
};

// For when you need a specific entity type
export const parseEntityUrnAs = <T extends EntityType>(urn: string, expectedType: T): ParsedURN<T> | null => {
  const parsed = parseEntityUrn<T>(urn);
  if (!parsed || parsed.type !== expectedType) {
    return null;
  }
  return parsed;
};

export const getEntityUrn = <T extends EntityType>(entity: AbstractEntity<T>): EntityURN<T> => {
  return entity.id;
};

export const getEntityUrnOrFail = <T extends EntityType>(entity: AbstractEntity<T>): EntityURN<T> => {
  if (!entity.id) {
    throw new Error(`Entity missing ID: ${JSON.stringify(entity)}`);
  }
  return entity.id;
};

// Type guard for runtime URN validation
export const isValidEntityUrn = (urn: string): urn is EntityURN => {
  return parseEntityUrn(urn) !== null;
};
