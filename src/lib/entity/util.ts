import { createDirectionUrn, createPlaceUrn, createEntityUrn } from '~/lib/taxonomy';
import { randomUUID } from '~/lib/uuid';
import {
  Character,
  CharacterAttributes,
  CharacterCondition,
  DirectionURN,
  Entity,
  EntityType,
  Exit,
  ModifiableBoundedAttribute,
  ModifiableScalarAttribute,
  Place,
  PlaceAttributes,
  PlaceURN,
  Taxonomy,
  UUIDLike,
} from '@flux';

const identity = <T>(x: T): T => x;

export const isCharacter = (character: Entity): character is Character => {
  return character.type === EntityType.CHARACTER;
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

export type EntityCreator<T extends EntityType, A extends object> = (
  entity: Entity<T, A>,
) => Entity<T, A>;

export type FactoryOptions = {
  now?: number;
  uuid?: () => UUIDLike;
};

export const createEntity = <T extends EntityType, A extends object>(
  type: T,
  transform: EntityCreator<T, A> = identity,
  { now = Date.now(), uuid = randomUUID }: FactoryOptions = {},
): Entity<T, A> => {
  const urn = createEntityUrn(type, uuid());
  const defaults: Partial<Entity<T, A>> = {
    id: urn,
    type,
    name: '',
    description: '',
    attributes: {} as A,
    createdAt: now,
    updatedAt: now,
    version: 0
  };

  return transform(defaults as Entity<T, A>);
};

export const createCharacter = (
  transform: EntityCreator<EntityType.CHARACTER, CharacterAttributes> = identity,
  options: FactoryOptions = {},
): Character => {
  return createEntity(
    EntityType.CHARACTER,
    (entity) => transform({
      ...entity,
      attributes: {
        level: 1,
        condition: CharacterCondition.ALIVE,
        hp: createModifiableBoundedAttribute(),
        mana: {},
        stats: {
          str: createModifiableScalarAttribute(),
          con: createModifiableScalarAttribute(),
          agi: createModifiableScalarAttribute(),
          dex: createModifiableScalarAttribute(),
          spd: createModifiableScalarAttribute(),
          int: createModifiableScalarAttribute(),
          wis: createModifiableScalarAttribute(),
          cha: createModifiableScalarAttribute(),
        },
        injuries: {},
        mass: createModifiableScalarAttribute(attr => ({
          ...attr,
          natural: 70_000,
        })),
        origin: '',
        equipment: {},
        traits: {},
        skills: {},
        memberships: {},
        subscriptions: {},
        effects: {},
        inventory: {
          mass: 0,
          ts: 0,
          items: {},
        },
        abilities: {},
        preferences: {},
        reputation: {},
      },
    }),
    options,
  );
};

export const createPlace = (
  transform: EntityCreator<EntityType.PLACE, PlaceAttributes> = identity,
  options: FactoryOptions = {},
): Place => {
  return createEntity(
    EntityType.PLACE,
    (entity) => {
      return transform({
        ...entity,
        id: entity.id,
        attributes: {
          exits: {},
          entities: {},
          history: []
        }
      });
    },
    options,
  );
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
  label: string;
};

/**
 * Interface for defining a place and its connections
 */
export type PlaceDefinition = {
  id: string;
  name: string;
  description: string;
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
        id: createPlaceUrn(placeDef.id),
        name: placeDef.name,
        description: placeDef.description,
        attributes: {
          exits: Object.fromEntries(
            placeDef.edges.map(edge => [
              directions[edge.direction as keyof typeof directions],
              createExit(exit => ({
                ...exit,
                label: edge.label,
                to: urns[edge.to]
              }))
            ])
          ),
          entities: {},
          monsters: {},
          history: [],
        },
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

/**
 * Creates a connected graph of places from place definitions
 */
export const createPlaceGraph = (
  placeDefinitions: PlaceDefinition[],
  directions: Record<string, Taxonomy.Directions> = DEFAULT_DIRECTIONS,
): PlaceGraph => {
  validatePlaceDefinitions(placeDefinitions, directions);

  const urnEntries = placeDefinitions.map(place => [place.id, createPlaceUrn(place.id) as PlaceURN])
  const urns = Object.fromEntries(urnEntries);
  const places = createPlaces(placeDefinitions, directions, urns);

  return { places, urns };
};

const validatePlaceDefinitions = (
  placeDefinitions: PlaceDefinition[],
  directions: Record<string, Taxonomy.Directions>,
): void => {
  const placeIds = new Set(placeDefinitions.map(place => place.id));
  for (const place of placeDefinitions) {
    for (const edge of place.edges) {
      if (!placeIds.has(edge.to)) {
        throw new Error(`Invalid edge in place '${place.id}': Destination '${edge.to}' is not defined`);
      }
      if (!directions[edge.direction as keyof typeof directions]) {
        throw new Error(`Invalid direction '${edge.direction}' in place '${place.id}'`);
      }
    }
  }
};
