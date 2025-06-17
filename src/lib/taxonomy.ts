import {
  AbilityURN,
  ArmorURN,
  DirectionURN,
  EffectURN,
  EntityURN,
  ItemURN,
  PlaceURN,
  ROOT_NAMESPACE,
  RootNamespace,
  RootVocabulary,
  TAXONOMY,
  TraitURN,
  WeaponURN,
  SkillURN,
  StatURN,
  GroupURN,
} from '~/types/taxonomy';
import { EntityType } from '~/types/entity/entity';

// === Configuration ===

export type TaxonomyConfig = {
  /**
   * The root token for all places in the game world.
   * All place URNs will be prefixed with this token unless they are special cases.
   */
  worldToken: string;

  /**
   * Special place tokens that should not be prefixed with the world token.
   * For example: 'nowhere', 'void', etc.
   */
  specialPlaceTokens: string[];
};

export const DEFAULT_TAXONOMY_CONFIG: TaxonomyConfig = {
  worldToken: 'world',
  specialPlaceTokens: ['nowhere', 'world']
};

let currentConfig: TaxonomyConfig = DEFAULT_TAXONOMY_CONFIG;

/**
 * Configure the taxonomy system. This should be called early in the application lifecycle.
 */
export const configureTaxonomy = (config: Partial<TaxonomyConfig>) => {
  currentConfig = {
    ...DEFAULT_TAXONOMY_CONFIG,
    ...config
  };
};

// === Core URN Creation ===

export type TaxonomyURN<V extends RootVocabulary> = `${RootNamespace}:${V}:${string}`;

/**
 * Creates a URN from a vocabulary and an array of terms
 */
export function createTaxonomyUrn<V extends RootVocabulary>(vocabulary: V, terms: string[]): TaxonomyURN<V>;
/**
 * Creates a URN from a vocabulary and additional terms as variadic arguments
 */
export function createTaxonomyUrn<V extends RootVocabulary>(vocabulary: V, ...terms: string[]): TaxonomyURN<V>;
/**
 * Implementation of createTaxonomyUrn that handles both array and variadic terms
 */
export function createTaxonomyUrn<V extends RootVocabulary>(vocabulary: V, termsOrFirst: string[] | string, ...rest: string[]): TaxonomyURN<V> {
  if (!vocabulary) {
    throw new Error('Vocabulary is required to create a taxonomy URN');
  }

  // Convert arguments to a single array of terms
  const terms = Array.isArray(termsOrFirst) ? termsOrFirst : [termsOrFirst, ...rest];

  if (terms.length === 0) {
    throw new Error('At least one term is required to create a URN');
  }

  const emptyTerms = terms.filter(term => !term);
  if (emptyTerms.length > 0) {
    throw new Error('Empty or falsy terms are not allowed');
  }

  const invalidTerms = terms.filter(term => term.includes(':'));
  if (invalidTerms.length > 0) {
    throw new Error(`Terms may not contain a colon: ${invalidTerms.join(', ')}`);
  }

  return `${ROOT_NAMESPACE}:${vocabulary}:${terms.join(':')}`;
}

// === Entity URN Creators ===

export const createEntityUrn = <T extends EntityType>(type: T, ...terms: string[]): EntityURN<T> => {
  const vocabulary = type.toLowerCase() as RootVocabulary;
  return createTaxonomyUrn(vocabulary, ...terms) as EntityURN<T>;
};

// === Specific URN Creators ===

export const createPlaceUrn = (...terms: string[]): PlaceURN => {
  if (terms.length === 0) {
    throw new Error('At least one term is required to create a place URN');
  }

  // Skip world prefix for special cases
  if (terms[0] === 'world' || terms[0] === 'nowhere') {
    return createEntityUrn(EntityType.PLACE, ...terms);
  }

  // Always prefix with 'world'
  return createEntityUrn(EntityType.PLACE, 'world', ...terms);
};

export const createGroupUrn = (...terms: string[]): GroupURN => createEntityUrn(EntityType.GROUP, ...terms);
export const createItemUrn = (...terms: string[]): ItemURN => createTaxonomyUrn('item', ...terms);
export const createTraitUrn = (...terms: string[]): TraitURN => createTaxonomyUrn('trait', ...terms);
export const createSkillUrn = (...terms: string[]): SkillURN => createTaxonomyUrn('skill', ...terms);
export const createAbilityUrn = (...terms: string[]): AbilityURN => createTaxonomyUrn('ability', ...terms);
export const createWeaponUrn = (...terms: string[]): WeaponURN => createTaxonomyUrn('weapon', ...terms);
export const createArmorUrn = (...terms: string[]): ArmorURN => createTaxonomyUrn('armor', ...terms);
export const createDirectionUrn = (...terms: string[]): DirectionURN => createTaxonomyUrn('direction', ...terms);
export const createEffectUrn = (...terms: string[]): EffectURN => createTaxonomyUrn('effect', ...terms);
export const createStatUrn = (...terms: string[]): StatURN => createTaxonomyUrn('stat', ...terms);

// === URN Parsing ===

/**
 * Parses a URN into its components
 */
export const parseUrn = (urn: string): {
  namespace: string;
  term: string;
  id?: string;
} | null => {
  const parts = urn.split(':');
  if (parts.length < 2) return null;

  const namespace = parts[0];
  let validTerm = findLongestValidTerm(parts.slice(1));

  if (!validTerm) {
    return null;
  }

  const termParts = validTerm.split(':').length;
  const id = parts.length > termParts + 1 ? parts.slice(termParts + 1).join(':') : undefined;

  return {
    namespace,
    term: validTerm,
    ...(id && { id })
  };
};

const findLongestValidTerm = (parts: string[]): string | null => {
  let validTerm = '';

  for (let i = 1; i <= parts.length; i++) {
    const testTerm = parts.slice(0, i).join(':');
    if (testTerm in TAXONOMY.terms) {
      validTerm = testTerm;
    }
  }

  if (!validTerm && parts.length > 0 && parts[0] in TAXONOMY.terms) {
    validTerm = parts[0];
  }

  return validTerm || null;
};

// === Type Guards ===

export const isRootVocabulary = (term: string): boolean => {
  return !term.includes(':') && term in TAXONOMY.terms;
};

/**
 * Extracts the entity type from an EntityURN
 * @param urn The URN to extract type from
 * @returns The EntityType
 * @throws If the URN format is invalid or type is not recognized
 */
export const getEntityType = (urn: EntityURN): EntityType => {
  const [namespace, type] = urn.split(':');
  if (namespace !== ROOT_NAMESPACE || !type) {
    throw new Error(`Invalid URN format: ${urn}`);
  }
  if (!Object.values(EntityType).includes(type as EntityType)) {
    throw new Error(`Unknown entity type: ${type}`);
  }
  return type as EntityType;
};

export const isUrnOfTerm = (urn: string, term: keyof typeof TAXONOMY.terms): boolean => {
  const parsed = parseUrn(urn);
  return parsed !== null && parsed.term === term;
};

export const isUrnOfVocabulary = (urn: string, vocabulary: RootVocabulary): boolean => {
  const parsed = parseUrn(urn);
  if (!parsed) return false;
  return parsed.term === vocabulary || parsed.term.startsWith(`${vocabulary}:`);
};

export const isPlaceUrn = (urn: string): urn is PlaceURN => isUrnOfVocabulary(urn, 'place');
export const isItemUrn = (urn: string): urn is ItemURN => isUrnOfVocabulary(urn, 'item');

// === Pattern Matching ===

export type UrnPattern = string;

export const matchUrnPattern = (urn: string, pattern: UrnPattern): boolean => {
  if (pattern.includes('+')) {
    const subPatterns = pattern.split('+');
    return subPatterns.every(subPattern => matchUrnPattern(urn, subPattern));
  }

  const urnParts = urn.split(':');
  const patternParts = pattern.split(':');

  return matchSegments(urnParts, patternParts, 0, 0);
};

const matchSegments = (
  urnParts: string[],
  patternParts: string[],
  urnIndex: number,
  patternIndex: number
): boolean => {
  if (patternIndex === patternParts.length) {
    return urnIndex === urnParts.length;
  }

  if (urnIndex === urnParts.length) {
    return patternParts.slice(patternIndex).every(part => part === '**');
  }

  const currentPattern = patternParts[patternIndex];

  if (currentPattern === '**') {
    if (matchSegments(urnParts, patternParts, urnIndex, patternIndex + 1)) {
      return true;
    }
    return matchSegments(urnParts, patternParts, urnIndex + 1, patternIndex);
  }

  if (currentPattern === '*') {
    return matchSegments(urnParts, patternParts, urnIndex + 1, patternIndex + 1);
  }

  if (currentPattern === urnParts[urnIndex]) {
    return matchSegments(urnParts, patternParts, urnIndex + 1, patternIndex + 1);
  }

  return false;
};

export const findMatchingUrns = (urns: string[], pattern: UrnPattern): string[] => {
  return urns.filter(urn => matchUrnPattern(urn, pattern));
};

// === Utility Functions ===

export const getRootVocabularies = (): string[] =>
  Object.keys(TAXONOMY.terms).filter(key => !key.includes(':'));

export const getSubterms = (vocabulary: string): string[] => {
  const prefix = `${vocabulary}:`;
  return Object.keys(TAXONOMY.terms).filter(key => key.startsWith(prefix));
};
