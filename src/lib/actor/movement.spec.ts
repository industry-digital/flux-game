import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useActorMovement } from './movement';
import {
  TransformerContext,
  EntityType,
  EventType,
  Character,
  Place,
  Direction,
  createCharacterUrn,
  createPlaceUrn,
  SpecialVisibility,
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
          [Direction.NORTH]: {
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
      timestamp: Date.now,
      uniqid: vi.fn().mockReturnValue('test-id')
    };
  });

  describe('successful movement', () => {
    it('should successfully move actor to valid destination', () => {
      const { move } = useActorMovement(mockContext);
      const direction = Direction.NORTH;

      const result = move(direction);

      expect(result).toEqual({ success: true });
    });

    it('should update actor location after successful move', () => {
      const { move } = useActorMovement(mockContext);
      const direction = Direction.NORTH;

      move(direction);

      expect(actor.location).toBe(destinationPlace.id);
    });

    it('should transfer actor entity from origin to destination', () => {
      const { move } = useActorMovement(mockContext);
      const direction = Direction.NORTH;

      move(direction);

      expect(originPlace.attributes.entities[actor.id]).toBeUndefined();
      expect(destinationPlace.attributes.entities[actor.id]).toBeDefined();
      expect(destinationPlace.attributes.entities[actor.id]?.entity).toBe(actor);
    });

    it('should declare movement success event', () => {
      const { move } = useActorMovement(mockContext);
      const direction = Direction.NORTH;

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
      const direction = Direction.SOUTH;

      const result = move(direction);

      expect(result.success).toBe(false);
    });

    it('should fail when destination place is not in projection', () => {
      // Remove destination from world
      delete mockContext.world.places[destinationPlace.id];

      const { move } = useActorMovement(mockContext);
      const direction = Direction.NORTH;

      const result = move(direction);

      expect(result.success).toBe(false);
    });

    it('should fail when actor is not found at origin', () => {
      // Remove actor from origin place
      delete originPlace.attributes.entities[actor.id];

      const { move } = useActorMovement(mockContext);
      const direction = Direction.NORTH;

      const result = move(direction);

      expect(result.success).toBe(false);
    });

    it('should declare movement failure event for missing exit', () => {
      const { move } = useActorMovement(mockContext);
      const direction = Direction.SOUTH;

      move(direction);

      expect(mockDeclareEvent).toHaveBeenCalledWith({
        type: EventType.ACTOR_MOVEMENT_DID_FAIL,
        payload: expect.objectContaining({
          actor: actor.id,
          origin: originPlace.id,
          direction,
        })
      });
    });

    it('should declare movement failure event for missing destination', () => {
      delete mockContext.world.places[destinationPlace.id];
      const { move } = useActorMovement(mockContext);
      const direction = Direction.NORTH;

      move(direction);

      expect(mockDeclareEvent).toHaveBeenCalledWith({
        type: EventType.ACTOR_MOVEMENT_DID_FAIL,
        payload: expect.objectContaining({
          actor: actor.id,
          origin: originPlace.id,
          direction,
        })
      });
    });

    it('should not modify world state on failed movement', () => {
      const originalActorLocation = actor.location;
      const originalOriginEntities = { ...originPlace.attributes.entities };
      const originalDestinationEntities = { ...destinationPlace.attributes.entities };

      const { move } = useActorMovement(mockContext);
      move(Direction.SOUTH); // Invalid direction

      expect(actor.location).toBe(originalActorLocation);
      expect(originPlace.attributes.entities).toEqual(originalOriginEntities);
      expect(destinationPlace.attributes.entities).toEqual(originalDestinationEntities);
    });
  });

  describe('invalid world state', () => {
    it('should return non-functional hook when actor is not found', () => {
      mockContext.world.actors = {};

      const { move } = useActorMovement(mockContext);
      const result = move(Direction.NORTH);

      expect(result.success).toBe(false);
    });

    it('should return non-functional hook when actor has no location', () => {
      actor.location = undefined;

      const { move } = useActorMovement(mockContext);
      const result = move(Direction.NORTH);

      expect(result.success).toBe(false);
    });

    it('should return non-functional hook when actor location not found', () => {
      mockContext.world.places = {};

      const { move } = useActorMovement(mockContext);
      const result = move(Direction.NORTH);

      expect(result.success).toBe(false);
    });

    it('should not declare events when using non-functional hook', () => {
      mockContext.world.actors = {};

      const { move } = useActorMovement(mockContext);
      move(Direction.NORTH);

      expect(mockDeclareEvent).not.toHaveBeenCalled();
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
      destinationPlace.attributes.exits[Direction.EAST] = {
        label: 'East Exit',
        to: thirdPlace.id
      };

      mockContext.world.places[thirdPlace.id] = thirdPlace;

      const { move } = useActorMovement(mockContext);

      // First movement
      const firstResult = move(Direction.NORTH);
      expect(firstResult).toEqual({ success: true });
      expect(actor.location).toBe(destinationPlace.id);

      // Second movement (need new hook instance since context changed)
      const { move: move2 } = useActorMovement(mockContext);
      const secondResult = move2(Direction.EAST);
      expect(secondResult).toEqual({ success: true });
      expect(actor.location).toBe(thirdPlace.id);

      // Verify entity is in the final location
      expect(thirdPlace.attributes.entities[actor.id]).toBeDefined();
      expect(destinationPlace.attributes.entities[actor.id]).toBeUndefined();
      expect(originPlace.attributes.entities[actor.id]).toBeUndefined();
    });
  });
});
