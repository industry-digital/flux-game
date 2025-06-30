import { Actor, Place, ActorURN, PlaceURN } from '@flux';
import { createPlaceUrn } from '~/lib/taxonomy';
import { createActor } from '~/worldkit/entity/actor';
import { createPlace } from '~/worldkit/entity/place';

/**
 * Hook-style utility for creating mock world states
 * Pure function that returns a new world projection each time
 */
export const createWorld = (overrides?: {
  actors?: Record<ActorURN, Actor>;
  places?: Record<PlaceURN, Place>;
}) => {
  return {
    actors: {},
    places: {},
    ...overrides
  };
};

/**
 * Hook-style utility for creating mock actors
 * Pure function with sensible defaults
 */
export const createTestActor = (overrides?: any): Actor => {
  const actorInput = {
    name: 'Test Actor',
    description: 'A test actor for unit testing',
    ...overrides
  };

  return createActor(actorInput);
};

/**
 * Hook-style utility for creating mock places
 * Pure function with sensible defaults
 */
export const createTestPlace = (overrides?: any): Place => {
  const placeInput = {
    id: createPlaceUrn('test', 'test-place'),
    name: 'Test Place',
    description: 'A test place for unit testing',
    ...overrides
  };

  return createPlace(placeInput);
};

/**
 * Hook-style utility for creating a world with pre-populated entities
 * Pure function that combines actors and places into world projection
 */
export const useMockPopulatedWorld = (config?: {
  actorCount?: number;
  placeCount?: number;
  actorFactory?: (index: number) => Actor;
  placeFactory?: (index: number) => Place;
}) => {
  const {
    actorCount = 2,
    placeCount = 2,
        actorFactory = (index: number) => createTestActor({
      name: `Test Actor ${index}`,
      description: `Test actor number ${index}`
    }),
    placeFactory = (index: number) => createTestPlace({
      id: createPlaceUrn('test', `test-place-${index}`),
      name: `Test Place ${index}`,
      description: `Test place number ${index}`
    })
  } = config || {};

  const actors: Record<ActorURN, Actor> = {};
  const places: Record<PlaceURN, Place> = {};

  // Create actors
  for (let i = 0; i < actorCount; i++) {
    const actor = actorFactory(i);
    actors[actor.id] = actor;
  }

  // Create places
  for (let i = 0; i < placeCount; i++) {
    const place = placeFactory(i);
    places[place.id] = place;
  }

  return { actors, places };
};

/**
 * Hook-style utility for creating world with specific actor-place relationships
 * Pure function that sets up connected world state
 */
export const useMockConnectedWorld = (config?: {
  actorLocation?: PlaceURN;
  customActors?: Actor[];
  customPlaces?: Place[];
}) => {
  const {
    actorLocation,
    customActors = [createTestActor()],
    customPlaces = [createTestPlace()]
  } = config || {};

  const actors: Record<ActorURN, Actor> = {};
  const places: Record<PlaceURN, Place> = {};

  // Add places first
  customPlaces.forEach(place => {
    places[place.id] = place;
  });

  // Add actors with optional location assignment
  customActors.forEach(actor => {
    const actorWithLocation = actorLocation ? {
      ...actor,
      location: actorLocation
    } : actor;

    actors[actor.id] = actorWithLocation as Actor;
  });

  return { actors, places };
};

/**
 * Hook-style utility for world assertion helpers
 * Pure functions that provide common test assertions
 */
export const useMockWorldAssertions = () => {
  return {
    /**
     * Assert that world contains expected number of entities
     */
    expectEntityCounts: (world: { actors: Record<string, any>; places: Record<string, any> }, expected: { actors?: number; places?: number }) => {
      const assertions = [];

      if (expected.actors !== undefined) {
        assertions.push({
          type: 'actorCount',
          actual: Object.keys(world.actors).length,
          expected: expected.actors
        });
      }

      if (expected.places !== undefined) {
        assertions.push({
          type: 'placeCount',
          actual: Object.keys(world.places).length,
          expected: expected.places
        });
      }

      return assertions;
    },

    /**
     * Assert that specific entities exist in world
     */
    expectEntitiesExist: (world: { actors: Record<string, any>; places: Record<string, any> }, entityIds: string[]) => {
      return entityIds.map(id => ({
        entityId: id,
        existsInActors: world.actors[id] !== undefined,
        existsInPlaces: world.places[id] !== undefined,
        exists: world.actors[id] !== undefined || world.places[id] !== undefined
      }));
    }
  };
};
