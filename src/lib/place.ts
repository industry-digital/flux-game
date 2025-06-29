import { Entity, Place, EntityURN, PlaceEntityDescriptor, TransformerContext, PlaceURN } from '@flux';
import { SpecialVisibility } from '~/types/world/visibility';
import { GeneratedResource, ResourceGenerator } from '~/types/entity/resource';
import { ResourceURN } from '~/types/taxonomy';
import { Duration, TimeUnit } from '~/types/world/time';

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
    visibility: PlaceEntityDescriptor['vis'] = SpecialVisibility.VISIBLE_TO_EVERYONE,
  ): boolean => {
    try {
      if (!place.entities) {
        place.entities = {};
      }

      place.entities[entity.id] = { vis: visibility };
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
        descriptor?.vis === SpecialVisibility.VISIBLE_TO_EVERYONE
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

/**
 * Calculate how much of a resource should be generated since the last update
 * This follows the event-driven pattern - resources only update when checked/accessed
 */
export const calculateResourceGeneration = (
  resource: GeneratedResource<ResourceURN>,
  currentTime: number
): number => {
  const timeSinceLastUpdate = currentTime - resource.ts;

  if (timeSinceLastUpdate <= 0) {
    return 0;
  }

  // Convert generation rate to per-millisecond
  const generationRatePerMs = convertDurationToMilliseconds(resource.rate.period);
  const baseGeneration = (resource.rate.quantity * timeSinceLastUpdate) / generationRatePerMs;

  // Ensure we don't exceed capacity or go below zero
  const currentAvailable = resource.available;
  const maxPossibleGeneration = resource.capacity - currentAvailable;
  const actualGeneration = Math.max(0, Math.min(baseGeneration, maxPossibleGeneration));

  return actualGeneration;
};

/**
 * Update resource generation for any entity that generates resources
 * This would be called when actors interact with the entity (event-driven)
 */
export const updateResourceGeneration = <T extends ResourceGenerator>(
  entity: T,
  currentTime: number = Date.now()
): T => {
  const updatedResources = { ...entity.resources };

  Object.entries(updatedResources).forEach(([resourceURN, resource]) => {
    const generation = calculateResourceGeneration(
      resource as GeneratedResource<ResourceURN>,
      currentTime
    );

    updatedResources[resourceURN as ResourceURN] = {
      ...resource,
      available: resource.available + generation,
      ts: currentTime
    } as GeneratedResource<ResourceURN>;
  });

  return {
    ...entity,
    resources: updatedResources
  };
};

/**
 * Place-specific wrapper for backward compatibility
 */
export const updatePlaceResourceGeneration = (
  place: Place,
  currentTime: number = Date.now()
): Place => {
  if (!place.resources) {
    return place;
  }

  // Create a temporary ResourceGenerator to pass to the generic function
  const resourceEntity: ResourceGenerator = { resources: place.resources };
  const updatedResourceEntity = updateResourceGeneration(resourceEntity, currentTime);

  return {
    ...place,
    resources: updatedResourceEntity.resources
  };
};

/**
 * Convert Duration string to milliseconds for calculations
 */
const convertDurationToMilliseconds = (duration: Duration): number => {
  if (typeof duration === 'string' && duration !== 'instant' && duration !== 'indefinite' && duration !== 'permanent') {
    const match = duration.match(/^(\d+)(\w+)$/);
    if (match) {
      const [, quantityStr, unit] = match;
      const quantity = parseInt(quantityStr, 10);

      switch (unit as TimeUnit) {
        case TimeUnit.MILLISECOND:
          return quantity;
        case TimeUnit.SECOND:
          return quantity * 1000;
        case TimeUnit.MINUTE:
          return quantity * 60 * 1000;
        case TimeUnit.HOUR:
          return quantity * 60 * 60 * 1000;
        case TimeUnit.DAY:
          return quantity * 24 * 60 * 60 * 1000;
        case TimeUnit.WEEK:
          return quantity * 7 * 24 * 60 * 60 * 1000;
        case TimeUnit.MONTH:
          return quantity * 30 * 24 * 60 * 60 * 1000; // Approximate
        case TimeUnit.SEASON:
          return quantity * 90 * 24 * 60 * 60 * 1000; // 3 months
        case TimeUnit.YEAR:
          return quantity * 365 * 24 * 60 * 60 * 1000;
        default:
          return 1000; // Default to 1 second
      }
    }
  }

  return 1000; // Default to 1 second for special durations
};

/**
 * Check if an entity can yield a specific resource
 * This would be called when an actor tries to harvest/gather resources
 */
export const canHarvestResource = (
  entity: { resources?: ResourceGenerator['resources'] },
  resourceURN: ResourceURN,
  requestedAmount: number
): boolean => {
  if (!entity.resources?.[resourceURN]) {
    return false;
  }

  const resource = entity.resources[resourceURN];
  return resource.available >= requestedAmount;
};

/**
 * Attempt to harvest resources from any resource-generating entity
 * Returns the actual amount harvested (may be less than requested)
 */
export const harvestResourceFromEntity = <T extends ResourceGenerator>(
  entity: T,
  resourceURN: ResourceURN,
  requestedAmount: number,
  currentTime: number = Date.now()
): { updatedEntity: T; harvestedAmount: number } => {
  // First update resource generation
  const updatedEntity = updateResourceGeneration(entity, currentTime);

  if (!updatedEntity.resources?.[resourceURN]) {
    return { updatedEntity, harvestedAmount: 0 };
  }

  const resource = updatedEntity.resources[resourceURN];
  const actualHarvest = Math.min(requestedAmount, resource.available);

  const finalEntity: T = {
    ...updatedEntity,
    resources: {
      ...updatedEntity.resources,
      [resourceURN]: {
        ...resource,
        available: resource.available - actualHarvest
      }
    }
  };

  return { updatedEntity: finalEntity, harvestedAmount: actualHarvest };
};

/**
 * Place-specific wrapper for backward compatibility
 */
export const harvestResourceFromPlace = (
  place: Place,
  resourceURN: ResourceURN,
  requestedAmount: number,
  currentTime: number = Date.now()
): { updatedPlace: Place; harvestedAmount: number } => {
  if (!place.resources) {
    return { updatedPlace: place, harvestedAmount: 0 };
  }

  // Create a temporary ResourceGenerator to pass to the generic function
  const resourceEntity: ResourceGenerator = { resources: place.resources };
  const result = harvestResourceFromEntity(resourceEntity, resourceURN, requestedAmount, currentTime);

  return {
    updatedPlace: { ...place, resources: result.updatedEntity.resources },
    harvestedAmount: result.harvestedAmount
  };
};
