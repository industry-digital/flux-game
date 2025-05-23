import * as typia from 'typia';
import {
  Entity,
  EntityType,
  EntityURN,
  EmergentNarrative,
  SymbolicLink,
  Character,
  Place
} from '~/types';

/**
 * Validator for the base Entity type
 * This validates the structure of any entity regardless of its specific type
 */
export const validateEntity = typia.createValidate<Entity>();

/**
 * Validator for Entity URNs
 * Checks if a string is a properly formatted entity identifier
 */
export const validateEntityURN = typia.createValidate<EntityURN>();

/**
 * Validator for SymbolicLink
 * Validates references to other entities
 */
export const validateSymbolicLink = typia.createValidate<SymbolicLink>();

/**
 * Validator for EmergentNarrative
 * Checks descriptions with base and emergent components
 */
export const validateEmergentNarrative = typia.createValidate<EmergentNarrative>();

/**
 * Factory function to create validators for entities of a specific type
 *
 * Usage:
 * const validateCharacter = createEntityValidator<CharacterAttributes>(EntityType.CHARACTER);
 * const validatePlace = createEntityValidator<PlaceAttributes>(EntityType.PLACE);
 */
export function createEntityValidator<T extends EntityType, A extends object>(type: T): (entity: unknown) => entity is Entity<T, A> {
  return (entity: unknown): entity is Entity<T, A> => {
    if (!validateEntity(entity)) {
      return false;
    }

    return (entity as Entity).type === type;
  };
}

/**
 * Validator for Character entities
 */
export const validateCharacter = typia.createValidate<Character>();

/**
 * Validator for Place entities
 */
export const validatePlace = typia.createValidate<Place>();

/**
 * Checks if an entity is of a specific type
 *
 * @param entity The entity to check
 * @param type The expected entity type
 */
export function isEntityOfType<T extends EntityType>(entity: Entity, type: T): entity is Entity<T> {
  return entity.type === type;
}

/**
 * Validates that a string is a valid entity type
 */
export function isValidEntityType(type: string): type is EntityType {
  return Object.values(EntityType).includes(type as EntityType);
}

/**
 * Validates that an entity has required base fields
 * This can be used when full validation might be too strict
 */
export function hasRequiredEntityFields(obj: any): boolean {
  return (
    typeof obj === 'object'
    && obj !== null
    && typeof obj.id === 'string'
    && typeof obj.type === 'string'
    && typeof obj.name === 'string'
    && (
      typeof obj.description === 'string' || (
        typeof obj.description === 'object' && typeof obj.description.base === 'string'
      )
    )
    && typeof obj.attributes === 'object'
    && typeof obj.createdAt === 'number'
    && typeof obj.updatedAt === 'number'
    && typeof obj.version === 'number'
  );
}

/**
 * Extracts entity type and ID from an EntityURN
 */
export function parseEntityURN(urn: string): { namespace: string; type: string; id: string } | null {
  const match = urn.match(/^([^:]+):([^:]+):(.+)$/);

  if (!match) {
    return null;
  }

  return {
    namespace: match[1],
    type: match[2],
    id: match[3]
  };
}
