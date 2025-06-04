import { createDirectionUrn, createPlaceUrn, createEntityUrn } from '~/lib/taxonomy';
import { randomUUID } from '~/lib/uuid';
import {
  Character, DirectionURN,
  Entity,
  EntityType,
  Exit,
  ModifiableBoundedAttribute,
  ModifiableScalarAttribute,
  Place,
  PlaceURN,
  Taxonomy,
  UUIDLike, CharacterInput
} from '@flux';
import { BaseEntity, parseURN, DescribableMixin } from '~/types/entity/entity';
import { merge } from 'lodash';

const identity = <T>(x: T): T => x;

export const isCharacter = (character: Entity): character is Character => {
  return character.id.type === EntityType.CHARACTER;
};

export const createModifiableScalarAttribute = (
  transform: (attribute: ModifiableScalarAttribute) => ModifiableScalarAttribute = identity,
): ModifiableScalarAttribute => {
  return transform({ natural: 10 });
};

export const createModifiableBoundedAttribute = (
  transform: (attribute: ModifiableBoundedAttribute) => ModifiableBoundedAttribute = identity,
): ModifiableBoundedAttribute => {
  return transform({ natural: { current: 10, max: 10 } });
};

export type EntityCreator<T extends EntityType, E extends BaseEntity<T> & DescribableMixin> = (
  entity: BaseEntity<T> & DescribableMixin,
) => E;

export type FactoryOptions = {
  now?: number;
  uuid?: () => UUIDLike;
};

export const createEntity = <T extends EntityType, E extends BaseEntity<T> & DescribableMixin>(
  type: T,
  transform: EntityCreator<T, E> = identity as EntityCreator<T, E>,
  { now = Date.now(), uuid = randomUUID }: FactoryOptions = {},
): E => {
  const id = uuid();
  const urn = createEntityUrn(type, id);
  const parsedUrn = parseURN(urn);
  const defaults: BaseEntity<T> & DescribableMixin = {
    id: parsedUrn,
    ts: now,
    version: 0,
    name: '',
    description: ''
  };

  return transform(defaults);
};

export const createCharacterInput = (
  input: Partial<CharacterInput> & Pick<CharacterInput, 'name' | 'description'>
): CharacterInput => {
  const defaults: CharacterInput = {
    name: input.name,
    description: input.description,
    vitals: {
      hp: { natural: { current: 100, max: 100 } },
      stats: {},
      mana: {},
      injuries: {},
      effects: {},
      traits: {}
    },
    inventory: {
      mass: 0,
      items: {},
      ts: Date.now(),
      equipment: {}
    },
    social: {
      memberships: {},
      reputation: {},
      subscriptions: {}
    },
    progression: {
      skills: {},
      specializations: {
        primary: {},
        secondary: {}
      }
    },
    preferences: {}
  };

  return merge({}, defaults, input);
};

export const createCharacter = (
  input: Partial<CharacterInput> & Pick<CharacterInput, 'name' | 'description'>,
  options: FactoryOptions = {},
): Character => {
  const characterInput = createCharacterInput(input);

  return createEntity<EntityType.CHARACTER, Character>(
    EntityType.CHARACTER,
    (entity) => {
      const defaults: Partial<Character> = {
        name: characterInput.name,
        description: characterInput.description,
        location: characterInput.location ? parseURN(characterInput.location.key as `flux:place:${string}`) : parseURN(createPlaceUrn('nowhere')),
        vitals: {
          hp: createModifiableBoundedAttribute(),
          stats: {},
          mana: {},
          injuries: {},
          effects: {},
          traits: {}
        },
        inventory: {
          mass: 0,
          items: {},
          ts: 0,
          equipment: {}
        },
        social: {
          memberships: {},
          reputation: {},
          subscriptions: {}
        },
        progression: {
          level: { natural: 1 },
          skills: {},
          specializations: {
            primary: {},
            secondary: {},
          }
        },
        preferences: {}
      };

      return merge({}, entity, defaults, characterInput) as Character;
    },
    options,
  );
};

export const createPlace = (
  transform: (place: Place) => Place = identity,
  options: FactoryOptions = {},
): Place => {
  const base = createEntity<EntityType.PLACE, Place>(
    EntityType.PLACE,
    (entity) => {
      const place: Place = {
        ...entity,
        exits: {},
        entities: {},
        memories: []
      };
      return place;
    },
    options,
  );

  return transform(base);
};

/**
 * Factory function to create an Exit with standard defaults
 * Follows the pattern of other entity creation functions
 */
export const createExit = (
  transform: (exit: Exit) => Exit = identity,
  { uuid = randomUUID }: FactoryOptions = {},
): Exit => {
  return transform({
    label: '',
    to: createPlaceUrn(uuid()),
  });
};

/**
 * Interface for edge definitions that connect places
 */
export type EdgeDefinition = {
  to: string;
  direction: string;
  label?: string;
};

/**
 * Interface for defining a place and its connections
 */
export type PlaceDefinition = {
  id: string;
  name?: string;
  description?: string;
  edges: EdgeDefinition[];
};

/**
 * Given a list of place definitions, create a map of places
 */
export const createPlaces = (
  placeDefinitions: PlaceDefinition[],
  directions: Record<string, Taxonomy.Directions>,
  urns: Record<string, PlaceURN>
): Record<string, Place> => {
  return Object.fromEntries(
    placeDefinitions.map(placeDef => {
      const payload = createPlace(place => ({
        ...place,
        name: placeDef.name || placeDef.id,
        description: placeDef.description || 'Lorem ipsum dolor sit amet',
        exits: Object.fromEntries(
          placeDef.edges.map(edge => [
            directions[edge.direction as keyof typeof directions],
            createExit(exit => ({
              ...exit,
              label: edge.label || `An exit to the ${edge.direction}`,
              to: urns[edge.to]
            }))
          ])
        ),
        entities: {},
        memories: []
      }));

      return [placeDef.id, payload];
    }),
  );
};

/**
 * Result type for a place graph, containing created places and their URNs
 */
export type PlaceGraph = {
  /** Map of place ID to place object */
  places: Record<string, Place>;
  /** Map of place ID to place URN for easy reference */
  urns: Record<string, Taxonomy.Places>;
};

const DEFAULT_DIRECTIONS: Record<string, DirectionURN> = Object.fromEntries(
    ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'].map(dir => {
      return [dir, createDirectionUrn(dir) as DirectionURN]
    }),
);

export type ValidationMode = 'graph' | 'single';

export interface ValidationOptions {
  mode?: ValidationMode;
}

/**
 * Maps a direction to its opposite
 */
const OPPOSITE_DIRECTIONS: Record<string, string> = {
  'north': 'south',
  'south': 'north',
  'east': 'west',
  'west': 'east',
  'northeast': 'southwest',
  'southwest': 'northeast',
  'northwest': 'southeast',
  'southeast': 'northwest'
};

/**
 * Validates that all places in the graph are properly connected with bidirectional edges
 */
const validateGraphConnectivity = (
  placeDefinitions: PlaceDefinition[],
  directions: Record<string, Taxonomy.Directions>
): void => {
  // Build a map of all edges for quick lookup
  const edgeMap = new Map<string, Set<string>>();

  // First pass: collect all edges
  for (const place of placeDefinitions) {
    const edges = place.edges ?? [];
    if (!edgeMap.has(place.id)) {
      edgeMap.set(place.id, new Set());
    }

    for (const edge of edges) {
      // Store as "fromId:direction:toId"
      edgeMap.get(place.id)!.add(`${edge.direction}:${edge.to}`);
    }
  }

  // Second pass: verify reciprocal edges exist
  for (const place of placeDefinitions) {
    const edges = place.edges ?? [];
    for (const edge of edges) {
      const oppositeDirection = OPPOSITE_DIRECTIONS[edge.direction];
      if (!oppositeDirection) {
        throw new Error(`Invalid direction '${edge.direction}' in place '${place.id}' - no opposite direction defined`);
      }

      // Check if the destination has a reciprocal edge back
      const destinationEdges = edgeMap.get(edge.to);
      if (!destinationEdges?.has(`${oppositeDirection}:${place.id}`)) {
        throw new Error(
          `Missing reciprocal edge: place '${edge.to}' should have a '${oppositeDirection}' exit to '${place.id}'`
        );
      }
    }
  }
};

const validatePlaceDefinitions = (
  placeDefinitions: PlaceDefinition[],
  directions: Record<string, Taxonomy.Directions>,
): void => {
  const placeIds = new Set(placeDefinitions.map(place => place.id));

  // First validate basic edge constraints
  for (const place of placeDefinitions) {
    const edges = place.edges ?? [];
    for (const edge of edges) {
      // Validate direction is valid
      if (!directions[edge.direction as keyof typeof directions]) {
        throw new Error(`Invalid direction '${edge.direction}' in place '${place.id}'`);
      }

      // Validate destination exists in graph
      if (!placeIds.has(edge.to)) {
        throw new Error(`Invalid edge in place '${place.id}': Destination '${edge.to}' is not defined in this graph`);
      }
    }
  }

  // Then validate graph connectivity
  validateGraphConnectivity(placeDefinitions, directions);
};

/**
 * Creates a connected graph of places from place definitions
 */
export const createPlaceGraph = (
  placeDefinitions: PlaceDefinition[],
  directions: Record<string, Taxonomy.Directions> = DEFAULT_DIRECTIONS,
  options: ValidationOptions = { mode: 'graph' }
): PlaceGraph => {
  validatePlaceDefinitions(placeDefinitions, directions);

  const urnEntries = placeDefinitions.map(place => [place.id, createPlaceUrn(place.id) as PlaceURN])
  const urns = Object.fromEntries(urnEntries);
  const places = createPlaces(placeDefinitions, directions, urns);

  return { places, urns };
};
