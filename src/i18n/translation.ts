import { EntityURN, PlaceURN, ROOT_NAMESPACE } from '@flux';

/**
 * Translation URN format: flux:i18n:entity_type:entity_id:property
 * Example: flux:i18n:place:world:tavern:rusty-dragon:name
 */
export type TranslationURN = `${typeof ROOT_NAMESPACE}:i18n:${string}`;

/**
 * Common translatable properties for entities
 */
export enum Translatable {
  NAME = 'name',
  DESCRIPTION = 'description',
  LABEL = 'label',
}

/**
 * Creates a translation URN for an entity property
 *
 * @param entityUrn The URN of the entity (e.g., flux:place:world:tavern)
 * @param property The property to translate (e.g., 'name', 'description')
 * @returns Translation URN (e.g., flux:i18n:place:world:tavern:name)
 */
export const createTranslationUrn = (
  entityUrn: EntityURN | PlaceURN,
  property: Translatable | string
): TranslationURN => {
  // Remove the flux: prefix and replace entity type with i18n
  const [, entityType, ...pathParts] = entityUrn.split(':');

  return `${ROOT_NAMESPACE}:i18n:${entityType}:${pathParts.join(':')}:${property}` as TranslationURN;
};

/**
 * Creates a translation URN for an exit label
 * Uses the source place URN and direction to create a unique translation key
 *
 * @param sourcePlaceUrn The URN of the place containing the exit
 * @param direction The direction of the exit (e.g., 'north', 'south')
 * @returns Translation URN for the exit label
 */
export const createExitTranslationUrn = (
  sourcePlaceUrn: PlaceURN,
  direction: string
): TranslationURN => {
  const [, , ...pathParts] = sourcePlaceUrn.split(':');

  return `${ROOT_NAMESPACE}:i18n:exit:${pathParts.join(':')}:${direction}:${Translatable.LABEL}` as TranslationURN;
};

/**
 * Parses a translation URN to extract its components
 *
 * @param translationUrn The translation URN to parse
 * @returns Parsed components or null if invalid
 */
export const parseTranslationUrn = (translationUrn: TranslationURN): {
  entityType: string;
  entityPath: string[];
  property: string;
} | null => {
  const parts = translationUrn.split(':');

  if (parts.length < 5 || parts[0] !== ROOT_NAMESPACE || parts[1] !== 'i18n') {
    return null;
  }

  const [, , entityType, ...rest] = parts;
  const property = rest.pop()!;
  const entityPath = rest;

  return {
    entityType,
    entityPath,
    property
  };
};

/**
 * Type guard to check if a string is a translation URN
 */
export const isTranslationUrn = (urn: string): urn is TranslationURN => {
  return urn.startsWith(`${ROOT_NAMESPACE}:i18n:`);
};
