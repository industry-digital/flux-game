import * as typia from 'typia';
import {
  Entity,
  EntityType,
  EntityURN,
  EmergentNarrative,
  SymbolicLink,
  Actor,
  Place,
  AbstractEntity
} from '@flux';
import { parseEntityUrn } from '~/lib/urn';

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
 */
export const validateSymbolicLink = typia.createValidate<SymbolicLink<EntityType>>();

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
export function createEntityValidator<T extends EntityType>(type: T): (entity: unknown) => entity is AbstractEntity<T> {
  return (entity: unknown): entity is AbstractEntity<T> => {
    if (!entity || typeof entity !== 'object') {
      return false;
    }

    const maybeEntity = entity as AbstractEntity<T>;
    const parsed = parseEntityUrn(maybeEntity.id);
    return parsed?.type === type;
  };
}

/**
 * Validator for Character entities
 */
export const validateCharacter = typia.createValidate<Actor>();

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
export function isEntityOfType<T extends EntityType>(entity: AbstractEntity<EntityType>, type: T): entity is AbstractEntity<T> {
  const parsed = parseEntityUrn(entity.id);
  return parsed?.type === type;
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
 * Type guard to check if an entity is a Place
 */
export function isPlace(entity: AbstractEntity<EntityType>): entity is Place {
  return isEntityOfType(entity, EntityType.PLACE);
}

/**
 * Type guard to check if an entity is a Character
 */
export function isCharacter(entity: AbstractEntity<EntityType>): entity is Actor {
  return isEntityOfType(entity, EntityType.ACTOR);
}

/**
 * Type guard to check if a URN is a Place URN
 */
export function isPlaceUrn(urn: EntityURN): urn is EntityURN<EntityType.PLACE> {
  const parsed = parseEntityUrn(urn);
  return parsed?.type === EntityType.PLACE;
}

/**
 * Type guard to check if a URN is a Character URN
 */
export function isCharacterUrn(urn: EntityURN): urn is EntityURN<EntityType.ACTOR> {
  const parsed = parseEntityUrn(urn);
  return parsed?.type === EntityType.ACTOR;
}

/**
 * Extracts entity type and ID from an EntityURN
 * @deprecated Use parseEntityUrn from '~/lib/entity/urn' instead
 */
export function parseEntityURN<T extends EntityType>(urn: string): SymbolicLink<T> | null {
  const parsed = parseEntityUrn<T>(urn);
  if (!parsed) return null;

  return {
    type: parsed.type,
    id: parsed.urn,
    path: parsed.path
  };
}
