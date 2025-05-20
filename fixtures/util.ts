import { ROOT_NAMESPACE } from '~/types/domain';
import { Taxonomy } from '~/taxonomy';
import { ModifiableScalarAttribute, ModifiableBoundedAttribute } from '~/entity/attribute';
import { EntityURN, EntityType, Entity } from '~/entity/entity';
import { Place, PlaceAttributes, Exit, PlaceURN } from '~/entity/place';
import { Character, CharacterAttributes, CharacterCondition } from '~/entity/character';

export const identity = <T>(x: T): T => x;

export const createModifiableScalarAttribute = (
  transform: (attribute: ModifiableScalarAttribute) => ModifiableScalarAttribute = identity
): ModifiableScalarAttribute => {
  return transform({ natural: 10 });
};

export const createModifiableBoundedAttribute = (
  transform: (attribute: ModifiableBoundedAttribute) => ModifiableBoundedAttribute = identity
): ModifiableBoundedAttribute => {
  return transform({ natural: { current: 10, max: 10 } });
};

export const createEntityUrn = <T extends EntityType>(type: T, ...tokens: string[]): EntityURN => {
  const prefix = `${ROOT_NAMESPACE}:${type}`;
  // Only filter out null/undefined, but keep empty strings if they're intentional
  const suffix = tokens.filter(token => token != null).join(':');
  return `${prefix}:${suffix}` as EntityURN;
};

// Generic type to create any entity type
export type EntityCreator<T extends EntityType, A extends object> = (
  entity: Entity<T, A>
) => Entity<T, A>;

export type FactoryOptions = {
  now?: number;
};

// Create a base entity with common properties but with proper typing
export const createBaseEntity = <T extends EntityType, A extends object>(
  type: T,
  transform: EntityCreator<T, A> = identity,
  { now = Date.now() }: FactoryOptions = {}
): Entity<T, A> => {
  // Create an entity with minimal defaults
  const baseEntity: Partial<Entity<T, A>> = {
    id: createEntityUrn(type, crypto.randomUUID()),
    type,
    name: '',
    description: '',
    attributes: {} as A,
    createdAt: now,
    updatedAt: now,
    version: 0
  };

  // Apply any transformations
  return transform(baseEntity as Entity<T, A>);
};

// Character creation with proper typing
export const createCharacter = (
  transform: EntityCreator<EntityType, CharacterAttributes> = identity,
  options: FactoryOptions = {}
): Character => {
  return createBaseEntity(
    'character',
    (baseEntity) => transform({
      ...baseEntity,
      attributes: {
        level: 1,
        condition: 'alive',
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
          natural: 70,
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
      },
    }),
    options,
  );
};

// Place creation with proper typing
export const createPlace = (
  transform: EntityCreator<EntityType.PLACE, PlaceAttributes> = identity,
  options: FactoryOptions = {}
): Place => {
  return createBaseEntity(
    EntityType.PLACE,
    (baseEntity) => {
      // Apply default place attributes
      const withDefaults: Place = {
        ...baseEntity,
        attributes: {
          exits: {},         // No exits by default
          entities: {},      // Empty place initially
          history: []        // No history yet
        }
      };

      // Apply user-provided transformations
      return transform(withDefaults);
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
): Exit => {
  return transform({
    label: '',
    to: createEntityUrn(EntityType.PLACE, crypto.randomUUID()) as PlaceURN,
  });
};


/**
 * Interface for edge definitions that connect places
 */
interface EdgeDefinition {
  to: string;
  direction: string;
  label: string;
}

/**
 * Interface for defining a place and its connections
 */
interface PlaceDefinition {
  id: string;
  name: string;
  description: string;
  edges: EdgeDefinition[];
}

/**
 * Result type for a place graph, containing created places and their URNs
 */
export interface PlaceGraph {
  /** Map of place ID to place object */
  places: Record<string, Place>;
  /** Map of place ID to place URN for easy reference */
  urns: Record<string, Taxonomy.Places>;
}

/**
 * Creates a connected graph of places from place definitions
 */
export const createPlaceGraph = (placeDefinitions: PlaceDefinition[]): PlaceGraph => {
  const urns = Object.fromEntries(
    placeDefinitions.map(place => [
      place.id,
      createEntityUrn(EntityType.PLACE, place.id) as Taxonomy.Places
    ])
  );

  const directions = {
    north: 'flux:direction:north' as Taxonomy.Directions,
    northeast: 'flux:direction:northeast' as Taxonomy.Directions,
    east: 'flux:direction:east' as Taxonomy.Directions,
    southeast: 'flux:direction:southeast' as Taxonomy.Directions,
    south: 'flux:direction:south' as Taxonomy.Directions,
    southwest: 'flux:direction:southwest' as Taxonomy.Directions,
    west: 'flux:direction:west' as Taxonomy.Directions,
    northwest: 'flux:direction:northwest' as Taxonomy.Directions
  };

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

  const places = Object.fromEntries(
    placeDefinitions.map(place => {
      const placeObj = createPlace(p => ({
        ...p,
        id: urns[place.id],
        name: place.name,
        description: {
          base: place.description,
          emergent: "",
        },
        attributes: {
          exits: Object.fromEntries(
            place.edges.map(edge => [
              directions[edge.direction as keyof typeof directions],
              createExit(exit => ({
                ...exit,
                label: edge.label,
                to: urns[edge.to]
              }))
            ])
          ),
          entities: {},
          history: []
        }
      }));

      return [place.id, placeObj];
    })
  );

  return {
    places,
    urns
  };
}
