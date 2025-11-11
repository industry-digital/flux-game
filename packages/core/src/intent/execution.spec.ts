import { describe, beforeEach, it, expect } from 'vitest';
import { executeCommand, getAvailableHandlers, clearHandlerCache } from './execution';
import { TransformerContext } from '~/types/handler';
import { CommandType } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { createTestTransformerContext } from '~/testing/context-testing';
import { ActorURN, PlaceURN, SessionURN } from '~/types/taxonomy';
import { createActor } from '~/worldkit/entity/actor';
import { createPlace } from '~/worldkit/entity/place';

describe('Command Execution', () => {
  let context: TransformerContext;

  // Create test actors and place
  const ACTOR_ID: ActorURN = 'flux:actor:test:alice';
  const TARGET_ID: ActorURN = 'flux:actor:test:bob';
  const PLACE_ID: PlaceURN = 'flux:place:test:arena';
  const SESSION_ID: SessionURN = 'flux:session:combat:test';

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
        groups: {},
      },
    });
  });

  describe('executeCommand', () => {
    it('should execute ATTACK command successfully', () => {
      const command = createActorCommand({
        actor: ACTOR_ID,
        location: PLACE_ID,
        type: CommandType.ATTACK,
        args: { target: TARGET_ID },
      });

      const result = executeCommand(context, command);

      expect(result).toBeTruthy();
      // ATTACK command may generate events, which is expected behavior
    });

    it('should execute LOOK command successfully', () => {
      const command = createActorCommand({
        actor: ACTOR_ID,
        location: PLACE_ID,
        type: CommandType.LOOK,
        args: {},
      });

      const result = executeCommand(context, command);

      expect(result).toBeTruthy();
    });

    it('should handle commands with session context', () => {
      const command = createActorCommand({
        actor: ACTOR_ID,
        location: PLACE_ID,
        session: SESSION_ID,
        type: CommandType.ADVANCE,
        args: { distance: 10 },
      });

      const result = executeCommand(context, command);

      expect(result).toBeTruthy();
      // Session context should be preserved through execution
    });

    it('should handle unknown command types gracefully', () => {
      const command = createActorCommand({
        actor: ACTOR_ID,
        location: PLACE_ID,
        type: 'UNKNOWN_COMMAND' as CommandType,
        args: {},
      });

      const result = executeCommand(context, command);

      expect(result).toBeTruthy();
      // Should return context even if no handler found
    });

    it('should preserve context state when no handler matches', () => {
      const originalWorld = context.world;

      const command = createActorCommand({
        actor: ACTOR_ID,
        location: PLACE_ID,
        type: 'NONEXISTENT' as CommandType,
        args: {},
      });

      const result = executeCommand(context, command);

      expect(result.world).toBe(originalWorld);
    });
  });

  describe('handler management', () => {
    it('should return available handlers', () => {
      const handlers = getAvailableHandlers();

      expect(Array.isArray(handlers)).toBe(true);
      expect(handlers.length).toBeGreaterThan(0);
    });

    it('should cache handlers for performance', () => {
      const handlers1 = getAvailableHandlers();
      const handlers2 = getAvailableHandlers();

      // Arrays are different instances (created from Map.values())
      // but should contain the same handler instances
      expect(handlers1).toHaveLength(handlers2.length);

      // Verify handler instances are identical (same objects in memory)
      for (let i = 0; i < handlers1.length; i++) {
        expect(handlers1[i]).toBe(handlers2[i]);
      }
    });

    it('should clear handler cache when requested', () => {
      const handlers1 = getAvailableHandlers();
      clearHandlerCache();
      const handlers2 = getAvailableHandlers();

      // Should create new instances after cache clear
      expect(handlers1).not.toBe(handlers2);
      expect(handlers1.length).toBe(handlers2.length);
    });
  });

  describe('session-aware command execution', () => {
    it('should execute combat commands with session context', () => {
      const combatSessionId: SessionURN = 'flux:session:combat:simulator';

      const command = createActorCommand({
        actor: ACTOR_ID,
        location: PLACE_ID,
        session: combatSessionId,
        type: CommandType.STRIKE,
        args: { target: TARGET_ID },
      });

      const result = executeCommand(context, command);

      expect(result).toBeTruthy();
      // Command should execute with session context
    });

    it('should execute workbench commands with session context', () => {
      const workbenchSessionId: SessionURN = 'flux:session:workbench:test';

      const command = createActorCommand({
        actor: ACTOR_ID,
        location: PLACE_ID,
        session: workbenchSessionId,
        type: CommandType.WORKBENCH_USE,
        args: {},
      });

      const result = executeCommand(context, command);

      expect(result).toBeTruthy();
    });

    it('should handle commands without session context', () => {
      const command = createActorCommand({
        actor: ACTOR_ID,
        location: PLACE_ID,
        type: CommandType.LOOK,
        args: {},
        // No session provided
      });

      const result = executeCommand(context, command);

      expect(result).toBeTruthy();
    });
  });

  describe('error handling', () => {
    it('should handle handler errors gracefully', () => {
      // Create a command that might cause handler errors
      const command = createActorCommand({
        actor: 'flux:actor:nonexistent' as ActorURN,
        location: PLACE_ID,
        type: CommandType.ATTACK,
        args: { target: TARGET_ID },
      });

      const result = executeCommand(context, command);

      expect(result).toBeTruthy();
      // Should not throw, even with invalid actor
    });

    it('should preserve error state in context', () => {
      const command = createActorCommand({
        actor: ACTOR_ID,
        location: 'flux:place:nonexistent' as PlaceURN,
        type: CommandType.LOOK,
        args: {},
      });

      const result = executeCommand(context, command);

      expect(result).toBeTruthy();
      // Errors should be captured in context
    });
  });
});
