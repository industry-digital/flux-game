import { Entity, Place, EntityURN, PlaceEntityDescriptor, TransformerContext } from '@flux';
import { formatURN } from '~/types/entity/entity';
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
  getEntity: <T extends Entity>(id: string) => T | undefined;

  /**
   * Get an entity by its ID, or throw an error if it doesn't exist.
   */
  getEntityOrFail: <T extends Entity>(id: string) => T;
};

type PlaceEntities = Partial<Record<EntityURN, PlaceEntityDescriptor>>;

/**
 * Retrieves the entities present in a Place
 */
export const getPlaceEntities = (place: Place | undefined): PlaceEntities | undefined => {
  if (!place?.entities) {
    return undefined;
  }

  return place.entities;
};

export type PlaceEntitiesHook = {
  placeEntities: PlaceEntities;
  addEntity: (entity: Entity) => void;
  removeEntity: (entity: Entity) => void;
  moveEntity: (entity: Entity, destination: Place) => void;
};

export const usePlaceEntities = (
  context: TransformerContext,
  place: Place,
): PlaceEntitiesHook => {
  const { world } = context;
  const { places } = world;

  const placeEntities = getPlaceEntities(place) || {};

  const addEntity = (entity: Entity) => {
    if (!place.entities) {
      place.entities = {};
    }
    place.entities[formatURN(entity.id)] = {
      entity,
      visibility: SpecialVisibility.VISIBLE_TO_EVERYONE,
    };
  };

  const removeEntity = (entity: Entity) => {
    if (!place.entities) return;
    delete place.entities[formatURN(entity.id)];
  };

  const moveEntity = (entity: Entity, destination: Place) => {
    if (!place.entities) return;
    if (!destination.entities) {
      destination.entities = {};
    }

    const descriptor = place.entities[formatURN(entity.id)];
    if (!descriptor) return;

    destination.entities[formatURN(entity.id)] = descriptor;
    delete place.entities[formatURN(entity.id)];
  };

  return {
    placeEntities,
    addEntity,
    removeEntity,
    moveEntity,
  };
};
