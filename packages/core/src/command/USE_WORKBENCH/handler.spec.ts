import { describe, it, expect, vi } from 'vitest';
import {
  USE_WORKBENCH,
  UseWorkbenchCommand,
  useWorkbenchReducer
} from './handler';
import { CommandType } from '~/types/intent';
import { EventType } from '~/types/event';
import { SessionStrategy, SessionStatus } from '~/types/session';
import { EntityType } from '~/types/entity/entity';
import {
  createTestTransformerContext,
  createCommand,
  createWorld,
  createTestActor
} from '~/testing';
import { createShell } from '~/worldkit/entity/actor/shell';
import { createActor } from '~/worldkit/entity/actor';
import { SessionURN } from '~/types/taxonomy';

describe('UseWorkbenchCommandHandler', () => {
  const handler = new USE_WORKBENCH();

  describe('handles method', () => {
    it('should return true for USE_WORKBENCH commands', () => {
      const command = createCommand(CommandType.USE_WORKBENCH, {
        actor: 'flux:actor:test:test-actor' as any,
        args: {}
      });

      expect(handler.handles(command)).toBe(true);
    });

    it('should return false for non-USE_WORKBENCH commands', () => {
      const command = createCommand(CommandType.CREATE_ACTOR);
      expect(handler.handles(command)).toBe(false);
    });

    it('should return false for non-command inputs', () => {
      const intent = { __type: 'intent', text: 'use workbench' };
      expect(handler.handles(intent as any)).toBe(false);
    });
  });

  describe('reducer behavior', () => {
    it('should create a new workbench session for an actor', () => {
      const actor = createTestActor({
        id: 'flux:actor:test:test-actor' as any,
        location: 'flux:place:test:workshop' as any,
      });

      const context = createTestTransformerContext({
        world: createWorld({
          actors: { [actor.id]: actor },
          sessions: {}
        })
      });

      const command = createCommand(CommandType.USE_WORKBENCH, {
        actor: actor.id,
        args: {}
      }) as UseWorkbenchCommand;

      const result = useWorkbenchReducer(context, command);

      // Should return the context
      expect(result).toBe(context);

      // Should have added session to world
      const sessionIds = Object.keys(context.world.sessions) as SessionURN[];
      expect(sessionIds).toHaveLength(1);

      const session = context.world.sessions[sessionIds[0]];
      expect(session.strategy).toBe(SessionStrategy.WORKBENCH);
      expect(session.status).toBe(SessionStatus.PENDING);
      expect(session.data.currentShellId).toBe(actor.currentShell);
      expect(session.data.pendingMutations).toEqual([]);

      // Should have added session to actor's active sessions
      expect(actor.sessions).toBeDefined();
      expect(actor.sessions![sessionIds[0]]).toBe(1);
    });

    it('should declare WORKBENCH_SESSION_DID_START event', () => {
      const shell = createShell({ id: 'shell-1', name: 'Test Shell' });
      const actor = createActor({
        location: 'flux:place:test:workshop',
        currentShell: shell.id,
        shells: { [shell.id]: shell }
      });

      const context = createTestTransformerContext({
        world: createWorld({
          actors: { [actor.id]: actor },
          sessions: {}
        })
      });

      const command = createCommand(CommandType.USE_WORKBENCH, {
        actor: actor.id,
        args: {}
      }) as UseWorkbenchCommand;

      useWorkbenchReducer(context, command);

      // Should have declared the workbench session start event
      expect(context.declareEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.WORKBENCH_SESSION_DID_START,
          actor: actor.id,
          location: actor.location,
          trace: command.id,
          payload: expect.objectContaining({
            sessionId: expect.any(String),
          }),
        })
      );
    });

    it('should reuse existing workbench session when sessionId is provided', () => {
      const shell = createShell({ id: 'shell-1', name: 'Test Shell' });
      const actor = createActor({
        id: 'flux:actor:test:test-actor' as any,
        location: 'flux:place:test:workshop' as any,
        currentShell: shell.id,
        shells: { [shell.id]: shell }
      });

      const existingSessionId = 'flux:session:workbench:existing' as any;
      const existingSession = {
        id: existingSessionId,
        type: EntityType.SESSION,
        strategy: SessionStrategy.WORKBENCH,
        status: SessionStatus.PENDING,
        data: {
          currentShellId: 'shell-1',
          pendingMutations: []
        }
      };

      const world = createWorld({
        actors: { [actor.id]: actor },
        sessions: { [existingSessionId]: existingSession }
      });

      const context = createTestTransformerContext({
        world,
        declareError: vi.fn(),
      });

      const command = createCommand(CommandType.USE_WORKBENCH, {
        actor: actor.id,
        args: { sessionId: existingSessionId }
      }) as UseWorkbenchCommand;

      const result = useWorkbenchReducer(context, command);

      // Should not have errors
      expect(context.declareError).not.toHaveBeenCalled();

      // Should not have created a new session event (reusing existing)
      expect(context.getDeclaredEvents()).toHaveLength(0);

      // Should still have only one session
      expect(Object.keys(world.sessions)).toHaveLength(1);
      expect(world.sessions[existingSessionId]).toBe(existingSession);
    });

    it('should handle error when actor does not exist', () => {
      const world = createWorld({
        actors: {},
        sessions: {}
      });

      const context = createTestTransformerContext({
        world,
        declareError: vi.fn(),
      });

      const command = createCommand(CommandType.USE_WORKBENCH, {
        actor: 'flux:actor:test:nonexistent' as any,
        args: {}
      }) as UseWorkbenchCommand;

      const result = useWorkbenchReducer(context, command);

      // Should have an error
      expect(context.declareError).toHaveBeenCalledWith('Actor not found in world projection', command.id);

      // Should not have created any events
      expect(context.getDeclaredEvents()).toHaveLength(0);

      // Should not have created any sessions
      expect(Object.keys(world.sessions)).toHaveLength(0);
    });

  });

  describe('handler integration', () => {
    it('should process a command end-to-end', () => {
      const shell = createShell({ id: 'shell-1', name: 'Test Shell' });
      const actor = createActor({
        location: 'flux:place:test:workshop' as any,
        currentShell: shell.id,
        shells: { [shell.id]: shell }
      });

      const context = createTestTransformerContext({
        world: createWorld({
          actors: { [actor.id]: actor },
          sessions: {}
        })
      });

      const command = createCommand(CommandType.USE_WORKBENCH, {
        actor: actor.id,
        args: {}
      }) as UseWorkbenchCommand;

      // Handler should recognize the command
      expect(handler.handles(command)).toBe(true);

      // Handler should process the command successfully
      const result = handler.reduce(context, command);

      // Verify the observable outcomes
      expect(result).toBe(context);

      // Should have created a session
      const sessionIds = Object.keys(context.world.sessions) as SessionURN[];
      expect(sessionIds).toHaveLength(1);

      // Actor should have the session in their active sessions
      expect(actor.sessions).toBeDefined();
      expect(actor.sessions![sessionIds[0]]).toBe(1);

      // Session should be properly configured
      const session = context.world.sessions[sessionIds[0]];
      expect(session.strategy).toBe(SessionStrategy.WORKBENCH);
      expect(session.status).toBe(SessionStatus.PENDING);
      expect(session.data.currentShellId).toBe(actor.currentShell);
    });

    it('should handle reusing existing session end-to-end', () => {
      const shell = createShell({ id: 'shell-1', name: 'Test Shell' });
      const actor = createActor({
        location: 'flux:place:test:workshop' as any,
        currentShell: shell.id,
        shells: { [shell.id]: shell }
      });

      const existingSessionId = 'flux:session:workbench:existing' as any;
      const existingSession = {
        id: existingSessionId,
        type: EntityType.SESSION,
        strategy: SessionStrategy.WORKBENCH,
        status: SessionStatus.PENDING,
        data: {
          currentShellId: 'shell-1',
          pendingMutations: []
        }
      };

      const context = createTestTransformerContext({
        world: createWorld({
          actors: { [actor.id]: actor },
          sessions: { [existingSessionId]: existingSession }
        })
      });

      const command = createCommand(CommandType.USE_WORKBENCH, {
        actor: actor.id,
        args: { sessionId: existingSessionId }
      }) as UseWorkbenchCommand;

      // Handler should recognize the command
      expect(handler.handles(command)).toBe(true);

      // Handler should process the command successfully
      const result = handler.reduce(context, command);

      // Verify the observable outcomes
      expect(result).toBe(context);

      // Should still have only one session (reused existing)
      expect(Object.keys(context.world.sessions)).toHaveLength(1);
      expect(context.world.sessions[existingSessionId]).toBe(existingSession);

      // Should not have declared a new session event (since reusing)
      expect(context.declareEvent).not.toHaveBeenCalled();
    });
  });

  describe('handler configuration', () => {
    it('should have empty dependencies', () => {
      expect(handler.dependencies).toEqual([]);
    });

    it('should use the correct reducer function', () => {
      expect(handler.reduce).toBe(useWorkbenchReducer);
    });
  });
});
