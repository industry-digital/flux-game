import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CREATE_PLACE,
  CreatePlaceCommand,
  createPlaceCommandReducer
} from './handler';
import { CommandType, EventType, TransformerContext, EntityType } from '@flux';
import { createEntityUrn, createPlaceUrn } from '~/lib/taxonomy';
import { Direction } from '~/types/world/space';

describe('CreatePlaceCommandHandler', () => {
  let handler: CREATE_PLACE;
  let mockContext: TransformerContext;

  beforeEach(() => {
    handler = new CREATE_PLACE();

    // Create mock context with clean world state
    mockContext = {
      world: {
        self: createEntityUrn(EntityType.ACTOR, 'test-actor'),
        actors: {},
        places: {}
      },
      random: vi.fn(() => 0.5),
      timestamp: vi.fn(() => 1234567890),
      uniqid: vi.fn(() => 'test-unique-id'),
      declareEvent: vi.fn(),
      declareError: vi.fn()
    } as unknown as TransformerContext;
  });

  describe('handles method', () => {
    it('should return true for CREATE_PLACE commands', () => {
      const command: CreatePlaceCommand = {
        __type: 'command',
        id: 'test-command-id',
        ts: 1234567890,
        type: CommandType.CREATE_PLACE,
        args: {
          id: createPlaceUrn('breach', 'warrens'),
          name: 'The Warrens',
          description: 'The Warrens are a collection of small, cramped apartments and shanties that are home to the city\'s poorest and most desperate.',
        }
      };

      const result = handler.handles(command);
      expect(result).toBe(true);
    });

    it('should return false for non-CREATE_PLACE commands', () => {
      const command = {
        __type: 'command',
        id: 'test-command-id',
        ts: 1234567890,
        type: CommandType.CREATE_ACTOR,
        actor: createEntityUrn(EntityType.ACTOR, 'test-actor'),
        args: {}
      } as any;

      const result = handler.handles(command);
      expect(result).toBe(false);
    });

    it('should return false for non-command inputs', () => {
      const intent = {
        __type: 'intent',
        text: 'create place tavern'
      };

      const result = handler.handles(intent as any);
      expect(result).toBe(false);
    });
  });

  describe('reducer behavior', () => {
    it('should add a new place to world.places', () => {
      const command: CreatePlaceCommand = {
        __type: 'command',
        id: 'test-command-id',
        ts: 1234567890,
        type: CommandType.CREATE_PLACE,
        args: {
          id: createPlaceUrn('test', 'rusty-dragon-tavern'),
          name: 'The Rusty Dragon Tavern',
          description: 'A cozy tavern filled with the warmth of hearth and good company'
        }
      };

      const result = createPlaceCommandReducer(mockContext, command);

      // Should have exactly one place in the world
      const placeIds = Object.keys(result.world.places);
      expect(placeIds).toHaveLength(1);

      // The place should have the expected properties
      const place = result.world.places[placeIds[0] as keyof typeof result.world.places];
      expect(place).toBeDefined();
      expect(place.type).toBe(EntityType.PLACE);
      expect(place.name).toBe('The Rusty Dragon Tavern');
      expect(place.description).toBe('A cozy tavern filled with the warmth of hearth and good company');
    });

    it('should declare PLACE_CREATION_DID_SUCCEED event', () => {
      const command: CreatePlaceCommand = {
        __type: 'command',
        id: 'test-command-id',
        ts: 1234567890,
        type: CommandType.CREATE_PLACE,
        args: {
          id: createPlaceUrn('test', 'test-place'),
          name: 'Test Place'
        }
      };

      createPlaceCommandReducer(mockContext, command);

      expect(mockContext.declareEvent).toHaveBeenCalledTimes(1);
      expect(mockContext.declareEvent).toHaveBeenCalledWith({
        type: EventType.ENTITY_CREATED,
        payload: {
          entityId: createPlaceUrn('test', 'test-place'),
        }
      });
    });

    it('should preserve existing places in the world', () => {
      // Add an existing place to the world
      const existingPlaceId = 'flux:place:world:existing';
      const existingPlace = {
        id: existingPlaceId,
        type: EntityType.PLACE,
        name: 'Existing Place'
      };
      mockContext.world.places[existingPlaceId] = existingPlace as any;

      const command: CreatePlaceCommand = {
        __type: 'command',
        id: 'test-command-id',
        ts: 1234567890,
        type: CommandType.CREATE_PLACE,
        args: {
          id: createPlaceUrn('test', 'new-place'),
          name: 'New Place'
        }
      };

      const result = createPlaceCommandReducer(mockContext, command);

      // Should have both places
      expect(Object.keys(result.world.places)).toHaveLength(2);
      expect(result.world.places[existingPlaceId]).toBe(existingPlace);

      // Find the new place
      const newPlaceId = Object.keys(result.world.places).find(id => id !== existingPlaceId);
      expect(newPlaceId).toBeDefined();
      expect(result.world.places[newPlaceId! as keyof typeof result.world.places].name).toBe('New Place');
    });

    it('should handle minimal place input', () => {
      const command: CreatePlaceCommand = {
        __type: 'command',
        id: 'test-command-id',
        ts: 1234567890,
        type: CommandType.CREATE_PLACE,
        args: {
          id: createPlaceUrn('test', 'minimal-place')
        }
      };

      const result = createPlaceCommandReducer(mockContext, command);

      const placeIds = Object.keys(result.world.places);
      expect(placeIds).toHaveLength(1);

      const place = result.world.places[placeIds[0] as keyof typeof result.world.places];
      expect(place.type).toBe(EntityType.PLACE);
      // Should have default values
      expect(place.name).toBeDefined();
      expect(place.description).toBeDefined();
      expect(place.exits).toBeDefined();
    });

    it('should create place with exits', () => {
      const command: CreatePlaceCommand = {
        __type: 'command',
        id: 'test-command-id',
        ts: 1234567890,
        type: CommandType.CREATE_PLACE,
        args: {
          id: createPlaceUrn('test', 'central-plaza'),
          name: 'Central Plaza',
          description: 'A bustling central area',
          exits: [
            {
              direction: Direction.NORTH,
              label: 'Northern District',
              to: createPlaceUrn('world', 'north')
            }
          ]
        }
      };

      const result = createPlaceCommandReducer(mockContext, command);
      const placeIds = Object.keys(result.world.places);
      const place = result.world.places[placeIds[0] as keyof typeof result.world.places];

      expect(place.name).toBe('Central Plaza');
      expect(place.exits).toBeDefined();
      // Exit inputs are an array, but the output is a map
      expect(place.exits[Direction.NORTH]).toBeDefined();
      expect(place.exits[Direction.NORTH]?.label).toBe('Northern District');
    });

    it('should return the updated context', () => {
      const command: CreatePlaceCommand = {
        __type: 'command',
        id: 'test-command-id',
        ts: 1234567890,
        type: CommandType.CREATE_PLACE,
        args: {
          id: createPlaceUrn('test', 'test-place'),
          name: 'Test Place'
        }
      };

      const result = createPlaceCommandReducer(mockContext, command);

      // Should return the context (possibly modified)
      expect(result).toBeDefined();
      expect(result.world).toBeDefined();
      expect(result.world.places).toBeDefined();
    });
  });

  describe('handler integration', () => {
    it('should process a command end-to-end', () => {
      const command: CreatePlaceCommand = {
        __type: 'command',
        id: 'test-command-id',
        ts: 1234567890,
        type: CommandType.CREATE_PLACE,
        args: {
          id: createPlaceUrn('test', 'integration-tavern'),
          name: 'Integration Test Tavern',
          description: 'A tavern created during integration testing'
        }
      };

      // Handler should recognize the command
      expect(handler.handles(command)).toBe(true);

      // Handler should process the command successfully
      const result = handler.reduce(mockContext, command);

      // Verify the observable outcomes
      expect(Object.keys(result.world.places)).toHaveLength(1);
      expect(mockContext.declareEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.ENTITY_CREATED,
          payload: {
            entityId: createPlaceUrn('test', 'integration-tavern'),
          }
        })
      );
    });
  });

  describe('handler configuration', () => {
    it('should have empty dependencies', () => {
      expect(handler.dependencies).toEqual([]);
    });

    it('should use the correct reducer function', () => {
      expect(handler.reduce).toBe(createPlaceCommandReducer);
    });
  });
});
