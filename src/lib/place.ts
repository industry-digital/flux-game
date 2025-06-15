import { Entity, Place, EntityURN, PlaceEntityDescriptor, TransformerContext, PlaceURN } from '@flux';
import { SpecialVisibility } from '~/types/world/visibility';

/**
 * Interface for entity-related operations
 * Provides methods to query and retrieve entities from a collection
 */
export interface EntityHook {
  entities: Record<EntityURN, Entity>;

  /**
   * Get an entity by its ID, or undefined if it doesn't exist.
   */
  getEntity: <T extends Entity>(id: EntityURN<T['type']>) => T | undefined;

  /**
   * Get an entity by its ID, or throw an error if it doesn't exist.
   */
  getEntityOrFail: <T extends Entity>(id: EntityURN<T['type']>) => T;

  /**
   * Check if an entity exists in the collection
   */
  hasEntity: (id: EntityURN) => boolean;

  /**
   * Get all entity IDs
   */
  getEntityIds: () => EntityURN[];
}

type PlaceEntities = Partial<Record<EntityURN, PlaceEntityDescriptor>>;

/**
 * Retrieves the entities present in a Place
 */
export const getPlaceEntities = (place: Place | undefined): PlaceEntities => {
  return place?.entities ?? {};
};

/**
 * Hook result for place operations
 */
export type PlaceHook = {
  place: Place | undefined;
  exists: boolean;
  error: string | undefined;
};

/**
 * Hook for accessing a place by its URN
 */
export const usePlace = (context: TransformerContext, placeId: PlaceURN): PlaceHook => {
  const { places } = context.world;
  const place = places[placeId];

  if (!place) {
    const error = `Place '${placeId}' not found in places projection`;
    context.declareError(error);
    return {
      place: undefined,
      exists: false,
      error
    };
  }

  return {
    place,
    exists: true,
    error: undefined
  };
};

/**
 * Hook result for place entity operations
 */
export type PlaceEntitiesHook = {
  placeEntities: PlaceEntities;
  entityCount: number;
  hasEntities: boolean;
  addEntity: (entity: Entity, visibility?: SpecialVisibility) => boolean;
  removeEntity: (entity: Entity) => boolean;
  moveEntity: (entity: Entity, destination: Place) => boolean;
  hasEntity: (entityId: EntityURN) => boolean;
  getEntity: (entityId: EntityURN) => PlaceEntityDescriptor | undefined;
  getVisibleEntities: () => PlaceEntities;
  getAllEntityIds: () => EntityURN[];
};

/**
 * Hook for managing entities within a place
 */
export const usePlaceEntities = (
  context: TransformerContext,
  place: Place | undefined,
): PlaceEntitiesHook => {
  if (!place) {
    // Return a safe, no-op implementation when place is undefined
    const emptyEntities: PlaceEntities = {};
    return {
      placeEntities: emptyEntities,
      entityCount: 0,
      hasEntities: false,
      addEntity: () => false,
      removeEntity: () => false,
      moveEntity: () => false,
      hasEntity: () => false,
      getEntity: () => undefined,
      getVisibleEntities: () => emptyEntities,
      getAllEntityIds: () => [],
    };
  }

  const placeEntities = getPlaceEntities(place);
  const entityCount = Object.keys(placeEntities).length;
  const hasEntities = entityCount > 0;

  const addEntity = (
    entity: Entity,
    visibility: PlaceEntityDescriptor['visibility'] = SpecialVisibility.VISIBLE_TO_EVERYONE,
  ): boolean => {
    try {
      if (!place.entities) {
        place.entities = {};
      }

      place.entities[entity.id] = { entity, visibility };
      return true;
    } catch (error) {
      context.declareError(`Failed to add entity '${entity.id}' to place: ${error}`);
      return false;
    }
  };

  const removeEntity = (entity: Entity): boolean => {
    try {
      if (!place.entities?.[entity.id]) {
        return false;
      }

      delete place.entities[entity.id];
      return true;
    } catch (error) {
      context.declareError(`Failed to remove entity '${entity.id}' from place: ${error}`);
      return false;
    }
  };

  const moveEntity = (entity: Entity, destination: Place): boolean => {
    try {
      if (!place.entities?.[entity.id]) {
        return false;
      }

      if (!destination.entities) {
        destination.entities = {};
      }

      const descriptor = place.entities[entity.id];
      destination.entities[entity.id] = descriptor;
      delete place.entities[entity.id];
      return true;
    } catch (error) {
      context.declareError(`Failed to move entity '${entity.id}' to destination: ${error}`);
      return false;
    }
  };

  const hasEntity = (entityId: EntityURN): boolean => {
    return !!(place.entities?.[entityId]);
  };

  const getEntity = (entityId: EntityURN): PlaceEntityDescriptor | undefined => {
    return place.entities?.[entityId];
  };

    const getVisibleEntities = (): PlaceEntities => {
    if (!place.entities) return {};

    return Object.fromEntries(
      Object.entries(place.entities).filter(([_, descriptor]) =>
        descriptor?.visibility === SpecialVisibility.VISIBLE_TO_EVERYONE
      )
    );
  };

  const getAllEntityIds = (): EntityURN[] => {
    return Object.keys(placeEntities) as EntityURN[];
  };

  return {
    placeEntities,
    entityCount,
    hasEntities,
    addEntity,
    removeEntity,
    moveEntity,
    hasEntity,
    getEntity,
    getVisibleEntities,
    getAllEntityIds,
  };
};
