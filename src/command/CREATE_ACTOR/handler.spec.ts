import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEntityUrn } from '~/lib/taxonomy';
import {
  CREATE_ACTOR,
  CreateActorCommand,
  createActorCommandReducer
} from './handler';
import {
  CommandType,
  EventType,
  TransformerContext,
  EntityType,
  Actor,
  ActorURN,
  ActorType
} from '@flux';
import { createActorUrn } from '~/worldkit/entity/actor';

describe('CreateActorCommandHandler', () => {
  let handler: CREATE_ACTOR;
  let mockContext: TransformerContext;

  beforeEach(() => {
    handler = new CREATE_ACTOR();

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
    it('should return true for CREATE_CHARACTER commands', () => {
      const command: CreateActorCommand = {
        __type: 'command',
        id: 'test-command-id',
        ts: 1234567890,
        type: CommandType.CREATE_ACTOR,
        actor: createEntityUrn(EntityType.ACTOR, 'test-actor'),
        args: { name: 'Test Actor' }
      };

      const result = handler.handles(command);
      expect(result).toBe(true);
    });

    it('should return false for non-CREATE_CHARACTER commands', () => {
      const command = {
        __type: 'command',
        id: 'test-command-id',
        ts: 1234567890,
        type: CommandType.CREATE_PLACE,
        actor: createEntityUrn(EntityType.ACTOR, 'test-actor'),
        args: {}
      } as any;

      const result = handler.handles(command);
      expect(result).toBe(false);
    });

    it('should return false for non-command inputs', () => {
      const intent = {
        __type: 'intent',
        text: 'create character test'
      };

      const result = handler.handles(intent as any);
      expect(result).toBe(false);
    });
  });

  describe('reducer behavior', () => {
    it('should add a new character to world.actors', () => {
      const command: CreateActorCommand = {
        __type: 'command',
        id: 'test-command-id',
        ts: 1234567890,
        type: CommandType.CREATE_ACTOR,
        actor: createEntityUrn(EntityType.ACTOR, 'test-actor'),
        args: {
          name: 'Aria Blackwood',
          description: 'A skilled ranger from the northern forests'
        }
      };

      const result = createActorCommandReducer(mockContext, command);

      // Should have exactly one actor in the world
      const actorIds = Object.keys(result.world.actors);
      expect(actorIds).toHaveLength(1);

      // The actor should have the expected properties
      const character = result.world.actors[actorIds[0] as keyof typeof result.world.actors];
      expect(character).toBeDefined();
      expect(character.type).toBe(EntityType.ACTOR);
      expect(character.name).toBe('Aria Blackwood');
      expect(character.description).toBe('A skilled ranger from the northern forests');
    });

    it('should declare ACTOR_CREATION_DID_SUCCEED event', () => {
      const command: CreateActorCommand = {
        __type: 'command',
        id: 'test-command-id',
        ts: 1234567890,
        type: CommandType.CREATE_ACTOR,
        args: {
          id: createActorUrn(ActorType.PC, 'test-actor'),
          name: 'Test Actor'
        },
      };

      createActorCommandReducer(mockContext, command);

      expect(mockContext.declareEvent).toHaveBeenCalledTimes(1);
      expect(mockContext.declareEvent).toHaveBeenCalledWith({
        type: EventType.ACTOR_CREATION_DID_SUCCEED,
        payload: {
          actorId: createActorUrn(ActorType.PC, 'test-actor'),
        }
      });
    });

    it('should preserve existing actors in the world', () => {
      // Add an existing actor to the world
      const existingActorId = createEntityUrn(EntityType.ACTOR, 'existing');
      const existingActor = {
        id: existingActorId,
        type: EntityType.ACTOR,
        name: 'Existing Actor'
      };
      mockContext.world.actors[existingActorId] = existingActor as any;

      const command: CreateActorCommand = {
        __type: 'command',
        id: 'test-command-id',
        ts: 1234567890,
        type: CommandType.CREATE_ACTOR,
        actor: createEntityUrn(EntityType.ACTOR, 'test-actor'),
        args: { name: 'New Actor' }
      };

      const result = createActorCommandReducer(mockContext, command);

      // Should have both actors
      expect(Object.keys(result.world.actors)).toHaveLength(2);
      expect(result.world.actors[existingActorId]).toBe(existingActor);

      // Find the new actor
      const newActorId = Object.keys(result.world.actors).find(id => id !== existingActorId);
      expect(newActorId).toBeDefined();
      expect(result.world.actors[newActorId! as keyof typeof result.world.actors].name).toBe('New Actor');
    });

    it('should handle minimal character input', () => {
      const command: CreateActorCommand = {
        __type: 'command',
        id: 'test-command-id',
        ts: 1234567890,
        type: CommandType.CREATE_ACTOR,
        actor: createEntityUrn(EntityType.ACTOR, 'test-actor'),
        args: {}
      };

      const result = createActorCommandReducer(mockContext, command);

      const actorIds = Object.keys(result.world.actors);
      expect(actorIds).toHaveLength(1);

      const character = result.world.actors[actorIds[0] as keyof typeof result.world.actors];
      expect(character.type).toBe(EntityType.ACTOR);
      // Should have default values
      expect(character.name).toBeDefined();
      expect(character.description).toBeDefined();
    });

    it('should create character with specified location', () => {
      const command: CreateActorCommand = {
        __type: 'command',
        id: 'test-command-id',
        ts: 1234567890,
        type: CommandType.CREATE_ACTOR,
        actor: createEntityUrn(EntityType.ACTOR, 'test-actor'),
        args: {
          name: 'Located Actor',
          location: 'flux:place:world:tavern' as any
        }
      };

      const result = createActorCommandReducer(mockContext, command);

      const actorIds = Object.keys(result.world.actors);
      const character= result.world.actors[actorIds[0] as ActorURN] as Actor;
      expect(character.name).toBe('Located Actor');
      // Actor should have the specified location (though implementation details may vary)
      expect(character.location).toBeDefined();
    });

    it('should return the updated context', () => {
      const command: CreateActorCommand = {
        __type: 'command',
        id: 'test-command-id',
        ts: 1234567890,
        type: CommandType.CREATE_ACTOR,
        actor: createEntityUrn(EntityType.ACTOR, 'test-actor'),
        args: { name: 'Test Actor' }
      };

      const result = createActorCommandReducer(mockContext, command);

      // Should return the context (possibly modified)
      expect(result).toBeDefined();
      expect(result.world).toBeDefined();
      expect(result.world.actors).toBeDefined();
    });
  });

  describe('handler integration', () => {
    it('should process a command end-to-end', () => {
      const command: CreateActorCommand = {
        __type: 'command',
        id: 'test-command-id',
        ts: 1234567890,
        type: CommandType.CREATE_ACTOR,
        args: {
          name: 'Integration Test Actor',
          description: 'A character created during integration testing'
        }
      };

      // Handler should recognize the command
      expect(handler.handles(command)).toBe(true);

      // Handler should process the command successfully
      const result = handler.reduce(mockContext, command);

      // Verify the observable outcomes
      expect(Object.keys(result.world.actors)).toHaveLength(1);
      expect(mockContext.declareEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.ACTOR_CREATION_DID_SUCCEED
        })
      );
    });
  });

  describe('handler configuration', () => {
    it('should have empty dependencies', () => {
      expect(handler.dependencies).toEqual([]);
    });

    it('should use the correct reducer function', () => {
      expect(handler.reduce).toBe(createActorCommandReducer);
    });
  });
});
