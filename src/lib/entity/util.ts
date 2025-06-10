import { createDirectionUrn, createPlaceUrn, createEntityUrn } from '~/lib/taxonomy';
import { randomUUID } from '~/lib/uuid';
import {
  Character, DirectionURN, EntityType,
  Exit,
  ModifiableBoundedAttribute,
  ModifiableScalarAttribute,
  Place,
  PlaceURN,
  Taxonomy,
  UUIDLike, CharacterInput,
  RootNamespace
} from '@flux';
import { AbstractEntity, DescribableMixin, SymbolicLink } from '~/types/entity/entity';
import { merge } from 'lodash';

const identity = <T>(x: T): T => x;

export const isCharacter = (character: AbstractEntity<EntityType>): character is Character => {
  return character.type === EntityType.CHARACTER;
};

export const createModifiableScalarAttribute = (
  transform: (attribute: ModifiableScalarAttribute) => ModifiableScalarAttribute = identity,
): ModifiableScalarAttribute => {
  return transform({ nat: 10 });
};

export const createModifiableBoundedAttribute = (
  transform: (attribute: ModifiableBoundedAttribute) => ModifiableBoundedAttribute = identity,
): ModifiableBoundedAttribute => {
  return transform({ nat: { cur: 10, max: 10 } });
};

export type EntityCreator<T extends EntityType, E extends AbstractEntity<T> & DescribableMixin> = (
  entity: AbstractEntity<T> & DescribableMixin,
) => E;

export type FactoryOptions = {
  now?: number;
  uuid?: () => UUIDLike;
};

/**
 * Convert a URN string to a SymbolicLink
 */
export const createSymbolicLink = <T extends EntityType>(type: T, path: readonly string[]): SymbolicLink<T> => {
  // Create a mutable copy of the path for use with createEntityUrn
  const mutablePath = Array.from(path);
  return {
    type,
    id: createEntityUrn(type, ...mutablePath),
    path // Keep the original readonly path for the SymbolicLink
  };
};

export const createEntity = <T extends EntityType, E extends AbstractEntity<T> & DescribableMixin>(
  type: T,
  transform: EntityCreator<T, E> = identity as EntityCreator<T, E>,
  { now = Date.now(), uuid = randomUUID }: FactoryOptions = {},
): E => {
  const id = uuid();
  const urn = createEntityUrn(type, id) as `${RootNamespace}:${T}:${string}`;
  const path = [id];
  const defaults: AbstractEntity<T> & DescribableMixin = {
    type,
    id: urn,
    path,
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
    location: input.location
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
        location: characterInput.location
          ? createSymbolicLink(EntityType.PLACE, characterInput.location.split(':').slice(2)) as SymbolicLink<EntityType.PLACE>
          : createSymbolicLink(EntityType.PLACE, ['nowhere']) as SymbolicLink<EntityType.PLACE>,
        level: createModifiableScalarAttribute(),
        hp: createModifiableBoundedAttribute(),
        traits: {},
        stats: {},
        injuries: {},
        mana: {},
        effects: {},
        inventory: {
          mass: 0,
          items: {},
          ts: Date.now()
        },
        equipment: {},
        memberships: {},
        reputation: {},
        subscriptions: {},
        skills: {},
        specializations: {
          primary: {},
          secondary: {}
        },
        prefs: {}
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
      const defaults: Partial<Place> = {
        name: entity.name || '',
        description: entity.description || '',
        exits: {},
        entities: {}
      };

      return merge({}, entity, defaults) as Place;
    },
    options,
  );

  return transform(base);
};

/**
 * Factory function to create an Exit with standard defaults
 */
export const createExit = (
  transform: (exit: Exit) => Exit = identity,
  { uuid = randomUUID }: FactoryOptions = {},
): Exit => {
  return transform({
    label: '',
    to: createPlaceUrn(uuid()) as `${RootNamespace}:${EntityType.PLACE}:${string}`,
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
        throw new Error(`Missing reciprocal edge: place '${edge.to}' should have a '${oppositeDirection}' exit to '${place.id}'`);
      }
    }
  }
};
