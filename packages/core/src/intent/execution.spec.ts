import { describe, beforeEach, it, expect, vi } from 'vitest';
import { executeCommand, executeIntent, getAvailableHandlers, clearHandlerCache } from './execution';
import { TransformerContext } from '~/types/handler';
import { CommandType } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { createTestTransformerContext } from '~/testing/context-testing';
import { ActorURN, PlaceURN } from '~/types/taxonomy';
import { createActor } from '~/worldkit/entity/actor';
import { createPlace } from '~/worldkit/entity/place';

describe('Command Execution', () => {
  let context: TransformerContext;

  // Create test actors and place
  const ACTOR_ID: ActorURN = 'flux:actor:test:alice';
  const TARGET_ID: ActorURN = 'flux:actor:test:bob';
  const PLACE_ID: PlaceURN = 'flux:place:test:arena';

  beforeEach(() => {
    context = createTestTransformerContext({
      world: {
        actors: {
          [ACTOR_ID]: createActor({
            id: ACTOR_ID,
            name: 'Alice',
            location: PLACE_ID,
          }),
          [TARGET_ID]: createActor({
            id: TARGET_ID,
            name: 'Bob',
            location: PLACE_ID,
          }),
        },
        places: {
          [PLACE_ID]: createPlace({
            id: PLACE_ID,
            name: 'Test Arena',
          }),
        },
        items: {},
        sessions: {},
      },
    });
  });

  describe('executeCommand', () => {
    it('should execute ATTACK command successfully', () => {
      const command = createActorCommand({
        actor: ACTOR_ID,
        location: PLACE_ID,
        type: CommandType.ATTACK,
        args: {
          target: TARGET_ID,
        }
      });

      const result = executeCommand(context, command);

      expect(result).toBeTruthy();
      expect(result).toBe(context); // Should return updated context
    });

    it('should execute TARGET command successfully', () => {
      const command = createActorCommand({
        actor: ACTOR_ID,
        location: PLACE_ID,
        type: CommandType.TARGET,
        args: {
          target: TARGET_ID,
        }
      });

      const result = executeCommand(context, command);

      expect(result).toBeTruthy();
      expect(result).toBe(context);
    });

    it('should execute DEFEND command successfully', () => {
      const command = createActorCommand({
        actor: ACTOR_ID,
        location: PLACE_ID,
        type: CommandType.DEFEND,
        args: {
          autoDone: false
        }
      });

      const result = executeCommand(context, command);

      expect(result).toBeTruthy();
      expect(result).toBe(context);
    });

    it('should execute ADVANCE command successfully', () => {
      const command = createActorCommand({
        actor: ACTOR_ID,
        location: PLACE_ID,
        type: CommandType.ADVANCE,
        args: {
          type: 'distance',
          distance: 5
        }
      });

      const result = executeCommand(context, command);

      expect(result).toBeTruthy();
      expect(result).toBe(context);
    });

    it('should execute RETREAT command successfully', () => {
      const command = createActorCommand({
        actor: ACTOR_ID,
        location: PLACE_ID,
        type: CommandType.RETREAT,
        args: {
          type: 'distance',
          distance: 3
        }
      });

      const result = executeCommand(context, command);

      expect(result).toBeTruthy();
      expect(result).toBe(context);
    });

    it('should handle null command', () => {
      const errorSpy = vi.spyOn(context, 'declareError');

      const result = executeCommand(context, null as any);

      expect(result).toBe(context);
      expect(errorSpy).toHaveBeenCalledWith(
        'Command is required for execution',
        'command-execution'
      );
    });

    it('should handle command without type', () => {
      const errorSpy = vi.spyOn(context, 'declareError');
      const invalidCommand = { id: 'test' } as any;

      const result = executeCommand(context, invalidCommand);

      expect(result).toBe(context);
      expect(errorSpy).toHaveBeenCalledWith(
        'Command must have a type',
        'test'  // Uses the command's id as trace
      );
    });

    it('should handle unknown command type', () => {
      const errorSpy = vi.spyOn(context, 'declareError');
      const unknownCommand = createActorCommand({
        actor: ACTOR_ID,
        location: PLACE_ID,
        type: 'UNKNOWN_COMMAND' as any,
        args: {}
      });

      const result = executeCommand(context, unknownCommand);

      expect(result).toBe(context);
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('No handler found for command type: UNKNOWN_COMMAND'),
        unknownCommand.id
      );
    });

    it('should handle malformed command structure', () => {
      const errorSpy = vi.spyOn(context, 'declareError');
      const malformedCommand = {
        __type: 'command',
        id: 'test-id',
        type: CommandType.ATTACK,
        // Missing required fields like actor, location, etc.
      } as any;

      const result = executeCommand(context, malformedCommand);

      expect(result).toBe(context);
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should propagate handler execution errors', () => {
      const errorSpy = vi.spyOn(context, 'declareError');

      // Create a command that might cause handler errors (invalid actor)
      const command = createActorCommand({
        actor: 'flux:actor:nonexistent' as any,
        location: PLACE_ID,
        type: CommandType.ATTACK,
        args: {
          target: TARGET_ID,
        }
      });

      const result = executeCommand(context, command);

      expect(result).toBe(context);
      // Handler should have declared an error about missing actor
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('executeIntent', () => {
    it('should resolve and execute attack intent', () => {
      const result = executeIntent(context, ACTOR_ID, 'attack bob');

      expect(result).toBeTruthy();
      expect(result).toBe(context);
    });

    it('should resolve and execute defend intent', () => {
      const result = executeIntent(context, ACTOR_ID, 'defend');

      expect(result).toBeTruthy();
      expect(result).toBe(context);
    });

    it('should handle unresolvable intents', () => {
      const result = executeIntent(context, ACTOR_ID, 'dance a jig');

      expect(result).toBe(context); // Should return context even if intent fails
    });

    it('should handle empty intent text', () => {
      const result = executeIntent(context, ACTOR_ID, '');

      expect(result).toBe(context);
    });

    it('should work without explicit location', () => {
      const result = executeIntent(context, ACTOR_ID, 'defend');

      expect(result).toBeTruthy();
      expect(result).toBe(context);
    });
  });

  describe('getAvailableHandlers', () => {
    it('should return array of handlers', () => {
      const handlers = getAvailableHandlers();

      expect(Array.isArray(handlers)).toBe(true);
      expect(handlers.length).toBeGreaterThan(0);

      // Each handler should have required methods
      handlers.forEach(handler => {
        expect(typeof handler.reduce).toBe('function');
        expect(typeof handler.handles).toBe('function');
        expect(Array.isArray(handler.dependencies)).toBe(true);
      });
    });

    it('should return consistent handlers on multiple calls', () => {
      const handlers1 = getAvailableHandlers();
      const handlers2 = getAvailableHandlers();

      expect(handlers1).toBe(handlers2); // Should be the same cached array
      expect(handlers1.length).toBe(handlers2.length);
    });

    it('should include combat handlers', () => {
      const handlers = getAvailableHandlers();

      // Find handlers that can handle combat commands
      const attackHandler = handlers.find(h =>
        h.handles(createActorCommand({
          actor: ACTOR_ID,
          location: PLACE_ID,
          type: CommandType.ATTACK,
          args: { target: 'test' }
        }))
      );

      const defendHandler = handlers.find(h =>
        h.handles(createActorCommand({
          actor: ACTOR_ID,
          location: PLACE_ID,
          type: CommandType.DEFEND,
          args: {}
        }))
      );

      expect(attackHandler).toBeTruthy();
      expect(defendHandler).toBeTruthy();
    });
  });

  describe('clearHandlerCache', () => {
    it('should clear handler cache', () => {
      // Get handlers to populate cache
      const handlers1 = getAvailableHandlers();

      // Clear cache
      clearHandlerCache();

      // Get handlers again - should be new instances
      const handlers2 = getAvailableHandlers();

      expect(handlers1).not.toBe(handlers2); // Different array instances
      expect(handlers1.length).toBe(handlers2.length); // Same content
    });
  });

  describe('handler integration', () => {
    it('should find correct handler for each command type', () => {
      const handlers = getAvailableHandlers();

      const commandTypes = [
        CommandType.ATTACK,
        CommandType.DEFEND,
        CommandType.TARGET,
        CommandType.ADVANCE,
        CommandType.RETREAT
      ];

      commandTypes.forEach(type => {
        const command = createActorCommand({
          actor: ACTOR_ID,
          location: PLACE_ID,
          type,
          args: {}
        });

        const handler = handlers.find(h => h.handles(command));
        expect(handler).toBeTruthy();
      });
    });

    it('should validate command structure before execution', () => {
      const handlers = getAvailableHandlers();

      // Create a command with wrong structure - completely invalid
      const invalidCommand = {
        type: 'INVALID_TYPE',
        // Missing required ActorCommand fields
      } as any;

      const handler = handlers.find(h => h.handles(invalidCommand));
      expect(handler).toBeFalsy(); // Should not find handler for invalid structure
    });
  });

  describe('error recovery', () => {
    it('should continue execution after handler errors', () => {
      const errorSpy = vi.spyOn(context, 'declareError');

      // Execute a command that will cause an error
      const badCommand = createActorCommand({
        actor: 'flux:actor:nonexistent' as any,
        location: PLACE_ID,
        type: CommandType.ATTACK,
        args: { target: 'flux:actor:target' }
      });

      const result1 = executeCommand(context, badCommand);
      expect(result1).toBe(context);

      // Execute a good command after the error
      const goodCommand = createActorCommand({
        actor: ACTOR_ID,
        location: PLACE_ID,
        type: CommandType.DEFEND,
        args: {}
      });

      const result2 = executeCommand(context, goodCommand);
      expect(result2).toBe(context);

      expect(errorSpy).toHaveBeenCalled();
    });
  });
});
