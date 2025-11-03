import { describe, it, expect, beforeEach } from 'vitest';
import { shellStatusReducer } from './reducer';
import { AssessShellStatusCommand, AssessShellStatusCommandArgs } from './types';
import { ActorDidAssessShellStatus, EventType } from '~/types/event';
import { createTransformerContext } from '~/worldkit/context';
import { ALICE_ID, DEFAULT_LOCATION, DEFAULT_WORKBENCH_SESSION } from '~/testing/constants';
import { TransformerContext } from '~/types/handler';
import { CommandType } from '~/types/intent';
import { extractFirstEventOfType } from '~/testing/event';
import { ErrorCode } from '~/types/error';
import { createWorldScenario, WorldScenarioHook } from '~/worldkit/scenario';
import { createActor } from '~/worldkit/entity/actor';
import { createPlace } from '~/worldkit/entity/place';
import { Actor } from '~/types/entity/actor';
import { Place } from '~/types/entity/place';
import { createActorCommand } from '~/lib/intent';
import { createWorkbenchSessionApi } from '~/worldkit/workbench/session';
import { WorkbenchSession } from '~/types/workbench';
import { ActorURN } from '~/types/taxonomy';

describe('WORKBENCH_SHELL_STATUS Command Reducer', () => {
  let context: TransformerContext;
  let scenario: WorldScenarioHook;
  let alice: Actor;
  let place: Place;
  let command: AssessShellStatusCommand;
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

    command = createActorCommand<CommandType.WORKBENCH_SHELL_STATUS, AssessShellStatusCommandArgs>({
      type: CommandType.WORKBENCH_SHELL_STATUS,
      actor: ALICE_ID,
      session: session.id,
      args: {},
    });
  });

  describe('With Valid Workbench Session', () => {
    it('should assess shell status and emit event', () => {
      const result = shellStatusReducer(context, command);

      // Should succeed without errors
      expect(result.getDeclaredErrors()).toHaveLength(0);

      // Should declare ACTOR_DID_ASSESS_SHELL_STATUS event
      // Note: createWorkbenchSessionApi also generates WORKBENCH_SESSION_DID_START when creating new session
      const events = result.getDeclaredEvents();
      expect(events.length).toBeGreaterThanOrEqual(1);

      const statusEvent = extractFirstEventOfType<ActorDidAssessShellStatus>(
        events,
        EventType.ACTOR_DID_ASSESS_SHELL_STATUS
      )!;

      expect(statusEvent).toBeDefined();
      expect(statusEvent.session).toBe(session.id);
      expect(statusEvent.payload.shellId).toBe(alice.currentShell);
      expect(statusEvent.actor).toBe(ALICE_ID);
      expect(statusEvent.location).toBe(DEFAULT_LOCATION);
    });

    it('should work with multiple shells', () => {
      // Switch to a different shell if available
      const shellIds = Object.keys(alice.shells);
      if (shellIds.length > 1) {
        alice.currentShell = shellIds[1]; // Use second shell
      }

      const result = shellStatusReducer(context, command);

      expect(result.getDeclaredErrors()).toHaveLength(0);

      const events = result.getDeclaredEvents();
      const statusEvent = extractFirstEventOfType<ActorDidAssessShellStatus>(
        events,
        EventType.ACTOR_DID_ASSESS_SHELL_STATUS
      )!;

      expect(statusEvent.payload.shellId).toBe(alice.currentShell);
    });
  });

  describe('Error Cases', () => {
    it('should error when session is undefined', () => {
      // Command without session
      const testCommand = createActorCommand<CommandType.WORKBENCH_SHELL_STATUS, AssessShellStatusCommandArgs>({
        type: CommandType.WORKBENCH_SHELL_STATUS,
        actor: ALICE_ID,
        session: undefined,
        args: {},
      });

      const result = shellStatusReducer(context, testCommand);

      const errors = result.getDeclaredErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe(ErrorCode.INVALID_SESSION);
      // Error cases may still generate session start events before failing
      // The important thing is that no ACTOR_DID_ASSESS_SHELL_STATUS event is generated
      const events = result.getDeclaredEvents();
      const statusEvent = extractFirstEventOfType<ActorDidAssessShellStatus>(
        events,
        EventType.ACTOR_DID_ASSESS_SHELL_STATUS
      );
      expect(statusEvent).toBeUndefined();
    });

    it('should error when workbench session does not exist', () => {
      // Command with non-existent session
      const testCommand = createActorCommand<CommandType.WORKBENCH_SHELL_STATUS, AssessShellStatusCommandArgs>({
        type: CommandType.WORKBENCH_SHELL_STATUS,
        actor: ALICE_ID,
        session: 'flux:session:workbench:nonexistent',
        args: {},
      });

      const result = shellStatusReducer(context, testCommand);

      const errors = result.getDeclaredErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe(ErrorCode.INVALID_SESSION);
      // Error cases may still generate session start events before failing
      // The important thing is that no ACTOR_DID_ASSESS_SHELL_STATUS event is generated
      const events = result.getDeclaredEvents();
      const statusEvent = extractFirstEventOfType<ActorDidAssessShellStatus>(
        events,
        EventType.ACTOR_DID_ASSESS_SHELL_STATUS
      );
      expect(statusEvent).toBeUndefined();
    });

    it('should error when actor has no current shell', () => {
      // Remove current shell reference
      alice.currentShell = '';

      const result = shellStatusReducer(context, command);

      const errors = result.getDeclaredErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe(ErrorCode.INVALID_TARGET);
      // Error cases may still generate session start events before failing
      // The important thing is that no ACTOR_DID_ASSESS_SHELL_STATUS event is generated
      const events = result.getDeclaredEvents();
      const statusEvent = extractFirstEventOfType<ActorDidAssessShellStatus>(
        events,
        EventType.ACTOR_DID_ASSESS_SHELL_STATUS
      );
      expect(statusEvent).toBeUndefined();
    });

    it('should error when current shell does not exist in shells collection', () => {
      // Set current shell to non-existent shell
      alice.currentShell = 'flux:shell:nonexistent';

      const result = shellStatusReducer(context, command);

      const errors = result.getDeclaredErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe(ErrorCode.INVALID_TARGET);
      // Error cases may still generate session start events before failing
      // The important thing is that no ACTOR_DID_ASSESS_SHELL_STATUS event is generated
      const events = result.getDeclaredEvents();
      const statusEvent = extractFirstEventOfType<ActorDidAssessShellStatus>(
        events,
        EventType.ACTOR_DID_ASSESS_SHELL_STATUS
      );
      expect(statusEvent).toBeUndefined();
    });

    it('should error when actor does not exist', () => {
      // Command with non-existent actor
      const testCommand = createActorCommand<CommandType.WORKBENCH_SHELL_STATUS, AssessShellStatusCommandArgs>({
        type: CommandType.WORKBENCH_SHELL_STATUS,
        actor: 'flux:actor:nonexistent' as ActorURN,
        session: session.id,
        args: {},
      });

      const result = shellStatusReducer(context, testCommand);

      const errors = result.getDeclaredErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe(ErrorCode.INVALID_TARGET);
      // Error cases may still generate session start events before failing
      // The important thing is that no ACTOR_DID_ASSESS_SHELL_STATUS event is generated
      const events = result.getDeclaredEvents();
      const statusEvent = extractFirstEventOfType<ActorDidAssessShellStatus>(
        events,
        EventType.ACTOR_DID_ASSESS_SHELL_STATUS
      );
      expect(statusEvent).toBeUndefined();
    });

    it('should error when location does not exist', () => {
      // Remove the place from the world to simulate missing location
      delete context.world.places[DEFAULT_LOCATION];

      const result = shellStatusReducer(context, command);

      const errors = result.getDeclaredErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe(ErrorCode.INVALID_TARGET);
      // Error cases may still generate session start events before failing
      // The important thing is that no ACTOR_DID_ASSESS_SHELL_STATUS event is generated
      const events = result.getDeclaredEvents();
      const statusEvent = extractFirstEventOfType<ActorDidAssessShellStatus>(
        events,
        EventType.ACTOR_DID_ASSESS_SHELL_STATUS
      );
      expect(statusEvent).toBeUndefined();
    });
  });
});
