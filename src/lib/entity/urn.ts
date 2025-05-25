import { Entity, EntityType, EntityURN, SymbolicLink } from '@flux';

export const parseEntityUrn = (urn: string): SymbolicLink | null => {
  const matches = urn.match(/^flux:([^:]+):(.+)$/);
  if (!matches) {
    return null;
  }

  const [, typeStr, id] = matches;

  // Validate that the type is a valid EntityType
  if (!Object.values(EntityType).includes(typeStr as EntityType)) {
    return null;
  }

  return {
    type: typeStr as EntityType,
    id
  };
};

export const parseEntityUrnOrFail = (urn: string): SymbolicLink => {
  const parsed = parseEntityUrn(urn);
  if (!parsed) {
    throw new Error(`Invalid entity URN: ${urn}`);
  }
  return parsed;
};

// For when you need a specific entity type
export const parseEntityUrnAs = <T extends EntityType>(urn: string, expectedType: T): SymbolicLink<T> | null => {
  const parsed = parseEntityUrn(urn);
  if (!parsed || parsed.type !== expectedType) {
    return null;
  }
  return parsed as SymbolicLink<T>;
};

export const getEntityUrn = <T extends EntityType>(entity: Entity<T>): EntityURN<T> => {
  return entity.id;
};

export const getEntityUrnOrFail = <T extends EntityType>(entity: Entity<T>): EntityURN<T> => {
  if (!entity.id) {
    throw new Error(`Entity missing ID: ${JSON.stringify(entity)}`);
  }
  return entity.id;
};

// Type guard for runtime URN validation
export const isValidEntityUrn = (urn: string): urn is EntityURN => {
  return parseEntityUrn(urn) !== null;
};
