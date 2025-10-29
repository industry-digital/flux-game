import { describe, beforeEach, it, expect } from 'vitest';
import { SwapShellCommand, SwapShellCommandArgs } from './types';
import { swapShellReducer } from './reducer';
import { createTransformerContext } from '~/worldkit/context';
import { ALICE_ID, DEFAULT_LOCATION, DEFAULT_WORKBENCH_SESSION } from '~/testing/constants';
import { TransformerContext } from '~/types/handler';
import { CommandType } from '~/types/intent';
import { createWorldScenario, WorldScenarioHook } from '~/worldkit/scenario';
import { createActor } from '~/worldkit/entity/actor';
import { createPlace } from '~/worldkit/entity/place';
import { Actor } from '~/types/entity/actor';
import { Place } from '~/types/entity/place';
import { createActorCommand } from '~/lib/intent';
import { createWorkbenchSessionApi } from '~/worldkit/workbench/session';
import { WorkbenchSession } from '~/types/workbench';
import { ActorDidSwapShell, EventType } from '~/types/event';
import { ErrorCode } from '~/types/error';
import { extractFirstEventOfType } from '~/testing/event';

describe('WORKBENCH_SHELL_SWAP Command Reducer', () => {
  let context: TransformerContext;
  let scenario: WorldScenarioHook;
  let alice: Actor;
  let place: Place;
  let command: SwapShellCommand;
  let session: WorkbenchSession;

  beforeEach(() => {
    context = createTransformerContext();
    alice = createActor((a) => ({ ...a, id: ALICE_ID, location: DEFAULT_LOCATION }));
    place = createPlace((p) => ({ ...p, id: DEFAULT_LOCATION }));

    scenario = createWorldScenario(context, {
      places: [place],
      actors: [alice],
    });

    ({ session } = createWorkbenchSessionApi(context, ALICE_ID, DEFAULT_WORKBENCH_SESSION));

    command = createActorCommand<CommandType.WORKBENCH_SHELL_SWAP, SwapShellCommandArgs>({
      type: CommandType.WORKBENCH_SHELL_SWAP,
      actor: ALICE_ID,
      location: DEFAULT_LOCATION,
      session: session.id,
      args: {
        targetShellId: '2',
      },
    });
  });

  describe('successful shell swap', () => {
    it('should swap to target shell by ID', () => {
      // Verify initial state
      expect(alice.currentShell).toBe('1');

      // Execute command
      swapShellReducer(context, command);

      // Verify shell was swapped
      expect(alice.currentShell).toBe('2');

      // Verify events were declared
      const events = context.getDeclaredEvents();
      expect(events.length).toBeGreaterThanOrEqual(1);

      const swapEvent = extractFirstEventOfType<ActorDidSwapShell>(events, EventType.ACTOR_DID_SWAP_SHELL)!;
      expect(swapEvent).toBeDefined();
      expect(swapEvent.actor).toBe(ALICE_ID);
      expect(swapEvent.payload.fromShellId).toBe('1');
      expect(swapEvent.payload.toShellId).toBe('2');
    });

    it('should handle swapping to the same shell gracefully', () => {
      // Command to swap to current shell
      const sameShellCommand = createActorCommand<CommandType.WORKBENCH_SHELL_SWAP, SwapShellCommandArgs>({
        type: CommandType.WORKBENCH_SHELL_SWAP,
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        session: session.id,
        args: {
          targetShellId: '1', // Current shell
        },
      });

      // Execute command
      swapShellReducer(context, sameShellCommand);

      // Verify shell remains the same
      expect(alice.currentShell).toBe('1');

      // Should *NOT* generate event
      const events = context.getDeclaredEvents();
      const swapEvent = extractFirstEventOfType<ActorDidSwapShell>(events, EventType.ACTOR_DID_SWAP_SHELL);
      expect(swapEvent).toBeUndefined();
    });
  });

  describe('error cases', () => {
    it('should error when session does not exist', () => {
      // Create command with non-existent session
      const invalidSessionCommand = createActorCommand<CommandType.WORKBENCH_SHELL_SWAP, SwapShellCommandArgs>({
        type: CommandType.WORKBENCH_SHELL_SWAP,
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        session: 'flux:session:workbench:nonexistent',
        args: {
          targetShellId: '2',
        },
      });

      // Execute command
      swapShellReducer(context, invalidSessionCommand);

      // Verify error was declared
      const errors = context.getDeclaredErrors();
      expect(errors.length).toBe(1);
      expect(errors[0].code).toBe(ErrorCode.INVALID_SESSION);

      // Verify no shell swap occurred
      expect(alice.currentShell).toBe('1');

      // Verify no swap events were declared
      const events = context.getDeclaredEvents();
      const swapEvent = extractFirstEventOfType<ActorDidSwapShell>(events, EventType.ACTOR_DID_SWAP_SHELL);
      expect(swapEvent).toBeUndefined();
    });

    it('should error when target shell does not exist', () => {
      // Create command with non-existent shell
      const invalidShellCommand = createActorCommand<CommandType.WORKBENCH_SHELL_SWAP, SwapShellCommandArgs>({
        type: CommandType.WORKBENCH_SHELL_SWAP,
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        session: session.id,
        args: {
          targetShellId: 'nonexistent-shell',
        },
      });

      // Execute command
      swapShellReducer(context, invalidShellCommand);

      // Verify error was declared
      const errors = context.getDeclaredErrors();
      expect(errors.length).toBe(1);
      expect(errors[0].code).toBe(ErrorCode.NOT_FOUND);

      // Verify no shell swap occurred
      expect(alice.currentShell).toBe('1');
    });

    it('should error when actor does not exist', () => {
      // Create command with non-existent actor
      const invalidActorCommand = createActorCommand<CommandType.WORKBENCH_SHELL_SWAP, SwapShellCommandArgs>({
        type: CommandType.WORKBENCH_SHELL_SWAP,
        actor: 'flux:actor:nonexistent',
        location: DEFAULT_LOCATION,
        session: session.id,
        args: {
          targetShellId: '2',
        },
      });

      // Execute command
      swapShellReducer(context, invalidActorCommand);

      // Verify error was declared (from withBasicWorldStateValidation)
      const errors = context.getDeclaredErrors();
      expect(errors.length).toBe(1);
      expect(errors[0].code).toBe(ErrorCode.INVALID_TARGET);
    });

    it('should error when session is undefined', () => {
      // Create command with undefined session
      const noSessionCommand = createActorCommand<CommandType.WORKBENCH_SHELL_SWAP, SwapShellCommandArgs>({
        type: CommandType.WORKBENCH_SHELL_SWAP,
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        session: undefined,
        args: {
          targetShellId: '2',
        },
      });

      // Execute command
      swapShellReducer(context, noSessionCommand);

      // Verify error was declared
      const errors = context.getDeclaredErrors();
      expect(errors.length).toBe(1);
      expect(errors[0].code).toBe(ErrorCode.INVALID_SESSION);
    });
  });

  describe('edge cases', () => {
    it('should handle empty shell name gracefully', () => {
      // Create command with empty shell name
      const emptyNameCommand = createActorCommand<CommandType.WORKBENCH_SHELL_SWAP, SwapShellCommandArgs>({
        type: CommandType.WORKBENCH_SHELL_SWAP,
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        session: session.id,
        args: {
          targetShellId: '',
        },
      });

      // Execute command
      swapShellReducer(context, emptyNameCommand);

      // Should error since empty string won't match any shell
      const errors = context.getDeclaredErrors();
      expect(errors.length).toBe(1);
      expect(errors[0].code).toBe(ErrorCode.NOT_FOUND);
    });

    it('should handle whitespace-only shell name', () => {
      // Create command with whitespace-only shell name
      const whitespaceCommand = createActorCommand<CommandType.WORKBENCH_SHELL_SWAP, SwapShellCommandArgs>({
        type: CommandType.WORKBENCH_SHELL_SWAP,
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        session: session.id,
        args: {
          targetShellId: '   ',
        },
      });

      // Execute command
      swapShellReducer(context, whitespaceCommand);

      // Should error since whitespace won't match any shell
      const errors = context.getDeclaredErrors();
      expect(errors.length).toBe(1);
      expect(errors[0].code).toBe(ErrorCode.NOT_FOUND);
    });
  });
});
