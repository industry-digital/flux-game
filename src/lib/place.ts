import { Entity, Place, EntityURN, EntityType, PlaceEntities, PlaceEntityDescriptor, TransformerContext } from '@flux';

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

/**
 * Retrieves the entities present in a Place
 */
export const getPlaceEntities = (place: Place): PlaceEntities => {
  if (!place?.attributes?.entities) {
    throw new Error('Place does not have an `entities` attribute');
  }
  return place.attributes.entities;
};
export type PlaceEntitiesHook = {
  placeEntities: PlaceEntities;
  getPlaceEntity: <T extends EntityType>(id: EntityURN) => PlaceEntityDescriptor<T> | undefined;
  getPlaceEntityOrFail: <T extends EntityType>(id: EntityURN) => PlaceEntityDescriptor<T>;
  putPlaceEntity: <T extends EntityType>(id: EntityURN, descriptor: PlaceEntityDescriptor<T>) => void;
  deletePlaceEntity: (id: EntityURN) => void;
  transferPlaceEntity: (id: EntityURN, destinationPlace: Place) => boolean;
};

export const usePlaceEntities = (
  context: TransformerContext,
  place: Place,
): PlaceEntitiesHook => {
  const placeEntities = getPlaceEntities(place);

  const getPlaceEntity = <T extends EntityType>(id: EntityURN) => placeEntities[id] as PlaceEntityDescriptor<T> | undefined;

  const getPlaceEntityOrFail = <T extends EntityType>(id: EntityURN) => {
    const entity = getPlaceEntity<T>(id);
    if (!entity) {
      throw new Error(`Entity ${id} not found in place ${place.id}`);
    }
    return entity;
  };

  const putPlaceEntity = <T extends EntityType>(id: EntityURN, descriptor: PlaceEntityDescriptor<T>) => {
    placeEntities[id] = descriptor;
  };

  const deletePlaceEntity = (id: EntityURN): void => {
    if (placeEntities[id]) {
      delete placeEntities[id];
    }
  };

  const transferPlaceEntity = (id: EntityURN, destinationPlace: Place): boolean => {
    const entityDescriptor = placeEntities[id];
    if (!entityDescriptor) {
      return false; // Entity not found in current place
    }

    // Remove from current place
    delete placeEntities[id];

    // Add to destination place
    const destinationEntities = getPlaceEntities(destinationPlace);
    destinationEntities[id] = entityDescriptor;

    return true;
  };

  return {
    placeEntities,
    getPlaceEntity,
    getPlaceEntityOrFail,
    putPlaceEntity,
    deletePlaceEntity,
    transferPlaceEntity,
  };
};
