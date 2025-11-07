import {
  EntityURN,
  ItemURN,
  PlaceURN,
  ROOT_NAMESPACE,
  RootVocabulary,
  SessionURN,
  GroupURN,
  ActorURN,
} from '~/types/taxonomy';
import { EntityType } from '~/types/entity/entity';

const PREALLOCATED_PARTS = Array(10);

export const createEntityUrn = <T extends EntityType>(type: T, ...terms: string[]): EntityURN<T> => {
  PREALLOCATED_PARTS.length = terms.length + 2;

  PREALLOCATED_PARTS[0] = ROOT_NAMESPACE;
  PREALLOCATED_PARTS[1] = type.toLowerCase() as RootVocabulary;
  for (let i = 0; i < terms.length; i++) {
    PREALLOCATED_PARTS[i + 2] = terms[i];
  }

  return PREALLOCATED_PARTS.join(':') as EntityURN<T>;
};

// === Specific URN Creators ===

/**
 * @deprecated Use createEntityUrn instead
 */
export const createPlaceUrn = (...terms: string[]): PlaceURN => {
  if (terms.length === 0) {
    throw new Error('At least one term is required to create a place URN');
  }
  return createEntityUrn(EntityType.PLACE, ...terms);
};

const ROOT_NAMESPACE_PREFIX = `${ROOT_NAMESPACE}:`;
const ROOT_NAMESPACE_PREFIX_LENGTH = ROOT_NAMESPACE_PREFIX.length;

/**
 * Extracts the entity type from an EntityURN using zero-allocation string parsing
 * @param urn The URN to extract type from (e.g., "flux:place:foo:bar")
 * @returns The EntityType (e.g., "place")
 * @throws If the URN format is invalid or type is not recognized
 */
export const parseEntityType = (urn: EntityURN): EntityType => {
  // Check if URN starts with the root namespace prefix
  if (urn.indexOf(ROOT_NAMESPACE_PREFIX) !== 0) {
    throw new Error(`Invalid URN format: ${urn}`);
  }

  // Find the second colon to extract the entity type
  const secondColonIndex = urn.indexOf(':', ROOT_NAMESPACE_PREFIX_LENGTH);
  if (secondColonIndex === -1) {
    throw new Error(`Invalid URN format: ${urn}`);
  }

  // Extract the entity type substring without allocation
  const entityType = urn.substring(ROOT_NAMESPACE_PREFIX_LENGTH, secondColonIndex);

  // Validate entity type using direct comparison (faster than Object.values().includes())
  if (entityType === EntityType.ACTOR ||
      entityType === EntityType.PLACE ||
      entityType === EntityType.GROUP ||
      entityType === EntityType.SESSION) {

    return entityType as EntityType;
  }

  throw new Error(`Unknown entity type: ${entityType}`);
};

const ACTOR_URN_PREFIX: string = `${ROOT_NAMESPACE}:${EntityType.ACTOR}:`;
const PLACE_URN_PREFIX: string = `${ROOT_NAMESPACE}:${EntityType.PLACE}:`;
const SESSION_URN_PREFIX: string = `${ROOT_NAMESPACE}:${EntityType.SESSION}:`;
const GROUP_URN_PREFIX: string = `${ROOT_NAMESPACE}:${EntityType.GROUP}:`;
const ITEM_URN_PREFIX: string = `${ROOT_NAMESPACE}:item:`;

// Various URN type guards
// String.prototype.indexOf for fast string matching
export const isActorUrn = (urn: string): urn is ActorURN => urn.indexOf(ACTOR_URN_PREFIX) === 0
export const isPlaceUrn = (urn: string): urn is PlaceURN => urn.indexOf(PLACE_URN_PREFIX) === 0;
export const isSessionUrn = (urn: string): urn is SessionURN => urn.indexOf(SESSION_URN_PREFIX) === 0;
export const isGroupUrn = (urn: string): urn is GroupURN<any> => urn.indexOf(GROUP_URN_PREFIX) === 0;
export const isItemUrn = (urn: string): urn is ItemURN => urn.indexOf(ITEM_URN_PREFIX) === 0;
