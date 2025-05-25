import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useActorMovement } from './movement';
import {
  TransformerContext,
  EntityType,
  EventType,
  Character,
  Place,
  createCharacterUrn,
  createPlaceUrn,
  createDirectionUrn,
  SpecialVisibility
} from '@flux';

describe('useActorMovement', () => {
  let mockContext: TransformerContext;
  let mockDeclareEvent: ReturnType<typeof vi.fn>;
  let actor: Character;
  let originPlace: Place;
  let destinationPlace: Place;
  let now: number;

  beforeEach(() => {
    mockDeclareEvent = vi.fn();

    now = Date.now();

    actor = {
      id: createCharacterUrn('test-actor'),
      type: EntityType.CHARACTER,
      name: 'Test Actor',
      description: 'A test character',
      location: createPlaceUrn('origin'),
      attributes: {} as any,
      createdAt: now,
      updatedAt: now,
      version: 1
    };

    originPlace = {
      id: createPlaceUrn('origin'),
      type: EntityType.PLACE,
      name: 'Origin Room',
      description: 'Starting location',
      attributes: {
        exits: {
          [createDirectionUrn('north')]: {
            label: 'North Exit',
            to: createPlaceUrn('destination')
          }
        },
        entities: {
          [actor.id]: {
            entity: actor,
            visibility: SpecialVisibility.VISIBLE_TO_EVERYONE,
          }
        },
        history: []
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1
    };

    destinationPlace = {
      id: createPlaceUrn('destination'),
      type: EntityType.PLACE,
      name: 'Destination Room',
      description: 'Target location',
      attributes: {
        exits: {},
        entities: {},
        history: []
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1
    };

    mockContext = {
      world: {
        self: actor.id,
        actors: {
          [actor.id]: actor
        },
        places: {
          [originPlace.id]: originPlace,
          [destinationPlace.id]: destinationPlace
        }
      },
      declareEvent: mockDeclareEvent,
      declareError: vi.fn(),
      random: Math.random,
      now: Date.now
    };
  });

  describe('successful movement', () => {
    it('should successfully move actor to valid destination', () => {
      const { move } = useActorMovement(mockContext);
      const direction = createDirectionUrn('north');

      const result = move(direction);

      expect(result).toEqual({ success: true });
    });

    it('should update actor location after successful move', () => {
      const { move } = useActorMovement(mockContext);
      const direction = createDirectionUrn('north');

      move(direction);

      expect(actor.location).toBe(destinationPlace.id);
    });

    it('should transfer actor entity from origin to destination', () => {
      const { move } = useActorMovement(mockContext);
      const direction = createDirectionUrn('north');

      move(direction);

      expect(originPlace.attributes.entities[actor.id]).toBeUndefined();
      expect(destinationPlace.attributes.entities[actor.id]).toBeDefined();
      expect(destinationPlace.attributes.entities[actor.id]?.entity).toBe(actor);
    });

    it('should declare movement success event', () => {
      const { move } = useActorMovement(mockContext);
      const direction = createDirectionUrn('north');

      move(direction);

      expect(mockDeclareEvent).toHaveBeenCalledWith({
        type: EventType.ACTOR_MOVEMENT_DID_SUCCEED,
        payload: {
          actor: actor.id,
          direction,
          origin: originPlace.id,
          destination: destinationPlace.id
        }
      });
    });
  });

  describe('movement failures', () => {
    it('should fail when exit does not exist', () => {
      const { move } = useActorMovement(mockContext);
      const direction = createDirectionUrn('south');

      const result = move(direction);

      expect(result).toEqual({
        success: false,
        reason: 'No exit in that direction',
        message: "You can't go that way."
      });
    });

    it('should fail when destination place is not in projection', () => {
      // Remove destination from world
      delete mockContext.world.places[destinationPlace.id];

      const { move } = useActorMovement(mockContext);
      const direction = createDirectionUrn('north');

      const result = move(direction);

      expect(result).toEqual({
        success: false,
        reason: 'Destination place not found in `places` projection',
        message: "You can't go that way."
      });
    });

    it('should fail when actor is not found at origin', () => {
      // Remove actor from origin place
      delete originPlace.attributes.entities[actor.id];

      const { move } = useActorMovement(mockContext);
      const direction = createDirectionUrn('north');

      const result = move(direction);

      expect(result).toEqual({
        success: false,
        reason: 'Actor not found at `origin`',
        message: "You can't go that way."
      });
    });

    it('should declare movement failure event for missing exit', () => {
      const { move } = useActorMovement(mockContext);
      const direction = createDirectionUrn('south');

      move(direction);

      expect(mockDeclareEvent).toHaveBeenCalledWith({
        type: EventType.ACTOR_MOVEMENT_DID_FAIL,
        payload: {
          actor: actor.id,
          origin: originPlace.id,
          direction,
          reason: 'No exit in that direction',
          message: "You can't go that way."
        }
      });
    });

    it('should declare movement failure event for missing destination', () => {
      delete mockContext.world.places[destinationPlace.id];
      const { move } = useActorMovement(mockContext);
      const direction = createDirectionUrn('north');

      move(direction);

      expect(mockDeclareEvent).toHaveBeenCalledWith({
        type: EventType.ACTOR_MOVEMENT_DID_FAIL,
        payload: {
          actor: actor.id,
          origin: originPlace.id,
          direction,
          reason: 'Destination place not found in `places` projection',
          message: "You can't go that way."
        }
      });
    });

    it('should not modify world state on failed movement', () => {
      const originalActorLocation = actor.location;
      const originalOriginEntities = { ...originPlace.attributes.entities };
      const originalDestinationEntities = { ...destinationPlace.attributes.entities };

      const { move } = useActorMovement(mockContext);
      move(createDirectionUrn('south')); // Invalid direction

      expect(actor.location).toBe(originalActorLocation);
      expect(originPlace.attributes.entities).toEqual(originalOriginEntities);
      expect(destinationPlace.attributes.entities).toEqual(originalDestinationEntities);
    });
  });

  describe('initialization errors', () => {
    it('should throw when actor is not found in actors projection', () => {
      mockContext.world.actors = {};

      expect(() => useActorMovement(mockContext)).toThrow('Actor not found in `actors` projection');
    });

    it('should throw when actor has no location', () => {
      actor.location = undefined;

      expect(() => useActorMovement(mockContext)).toThrow('Actor does not have a `location`');
    });

    it('should throw when actor location is not found in places projection', () => {
      mockContext.world.places = {};

      expect(() => useActorMovement(mockContext)).toThrow('Actor location not found in `places` projection');
    });
  });

  describe('multiple movements', () => {
    it('should handle consecutive movements correctly', () => {
      // Add a third place
      const thirdPlace: Place = {
        id: createPlaceUrn('third'),
        type: EntityType.PLACE,
        name: 'Third Room',
        description: 'Another location',
        attributes: {
          exits: {},
          entities: {},
          history: []
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1
      };

      // Add exit from destination to third place
      destinationPlace.attributes.exits[createDirectionUrn('east')] = {
        label: 'East Exit',
        to: thirdPlace.id
      };

      mockContext.world.places[thirdPlace.id] = thirdPlace;

      const { move } = useActorMovement(mockContext);

      // First movement
      const firstResult = move(createDirectionUrn('north'));
      expect(firstResult).toEqual({ success: true });
      expect(actor.location).toBe(destinationPlace.id);

      // Second movement (need new hook instance since context changed)
      const { move: move2 } = useActorMovement(mockContext);
      const secondResult = move2(createDirectionUrn('east'));
      expect(secondResult).toEqual({ success: true });
      expect(actor.location).toBe(thirdPlace.id);

      // Verify entity is in the final location
      expect(thirdPlace.attributes.entities[actor.id]).toBeDefined();
      expect(destinationPlace.attributes.entities[actor.id]).toBeUndefined();
      expect(originPlace.attributes.entities[actor.id]).toBeUndefined();
    });
  });
});
