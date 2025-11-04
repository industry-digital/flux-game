import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  withExistingCombatSession,
  withPreventCrossSessionTargeting,
} from './validation';
import { useCombatScenario } from './testing/scenario';
import { createTransformerContext } from '~/worldkit/context';
import { ActorURN } from '~/types/taxonomy';
import { CommandType, Command } from '~/types/intent';
import { Team } from '~/types/combat';
import { ErrorCode } from '~/types/error';

// Mock command type for testing
type TestCommand = Command & {
  type: CommandType.STRIKE;
  actor: ActorURN;
  args: {
    target?: ActorURN;
  };
}

const DEFAULT_TIMESTAMP = 1234567890000;
const DEFAULT_SESSION_ID = 'flux:session:combat:arena';

type CommandTransformer = (command: TestCommand) => TestCommand;
const identity: CommandTransformer = (command) => command;

const createTestCommand = (scenario: ReturnType<typeof useCombatScenario>, transform = identity): TestCommand => {
  return transform({
    __type: 'command',
    id: 'test-cmd',
    trace: 'test-cmd',
    ts: DEFAULT_TIMESTAMP,
    type: CommandType.STRIKE,
    actor: 'flux:actor:alice' as ActorURN,
    session: scenario.session.id,
    args: {},
  });
};

const createNonCombatCommand = (transform = identity): TestCommand => {
  return transform({
    __type: 'command',
    id: 'test-cmd',
    trace: 'test-cmd',
    ts: DEFAULT_TIMESTAMP,
    type: CommandType.STRIKE,
    actor: 'flux:actor:dave' as ActorURN,
    session: 'flux:session:nonexistent',
    args: {},
  });
};

describe('Combat Validation Decorators', () => {
  let scenario: ReturnType<typeof useCombatScenario>;
  let context: ReturnType<typeof createTransformerContext>;
  let mockReducer: ReturnType<typeof vi.fn>;
  let errors: string[];

  const ALICE_ID: ActorURN = 'flux:actor:alice';
  const BOB_ID: ActorURN = 'flux:actor:bob';
  const CHARLIE_ID: ActorURN = 'flux:actor:charlie';
  const DAVE_ID: ActorURN = 'flux:actor:dave';

  beforeEach(() => {
    context = createTransformerContext();

    // Track errors
    errors = [];

    context.declareError = (message: string, trace?: string) => {
      errors.push(message);
    };

    // Create two separate combat scenarios to test cross-session validation
    scenario = useCombatScenario(context, {
      weapons: [],
      participants: {
        [ALICE_ID]: {
          team: Team.ALPHA,
          name: 'Alice',
        },
        [BOB_ID]: {
          team: Team.BRAVO,
          name: 'Bob',
        },
      },
    });

    // Create a second combat session with Charlie
    const scenario2 = useCombatScenario(context, {
      weapons: [],
      participants: {
        [CHARLIE_ID]: {
          team: Team.ALPHA,
          name: 'Charlie',
        },
      },
    });

    // Start both combat sessions so they have RUNNING status
    scenario.session.status = 'running' as any;
    scenario2.session.status = 'running' as any;

    // Add Dave as a non-combat actor
    const dave = scenario.actors[ALICE_ID].actor; // Use Alice as template
    context.world.actors[DAVE_ID] = {
      ...dave,
      id: DAVE_ID,
      name: 'Dave',
      session: scenario.session.id,
    };

    // Mock reducer - now expects three arguments: context, command, session
    mockReducer = vi.fn((ctx, cmd, session) => ctx);
  });

  describe('withExistingCombatSession', () => {
    it('should allow commands when actor has combat session', () => {
      const wrappedReducer = withExistingCombatSession(mockReducer);
      const command = createTestCommand(scenario);

      const result = wrappedReducer(context, command);

      // Check if there are any errors first
      if (errors.length > 0) {
        console.log('Unexpected errors:', errors);
      }

      expect(mockReducer).toHaveBeenCalledWith(context, command, scenario.session);
      expect(errors).toHaveLength(0);
      expect(result).toBe(context);
    });

    it('should block commands when actor has no combat session', () => {
      const wrappedReducer = withExistingCombatSession(mockReducer);
      const command = createTestCommand(scenario, (cmd) => ({ ...cmd, actor: DAVE_ID }));
      const result = wrappedReducer(context, command);

      expect(mockReducer).not.toHaveBeenCalled();
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain(ErrorCode.FORBIDDEN);
      expect(result).toBe(context);
    });

    it('should block commands when actor does not exist', () => {
      const wrappedReducer = withExistingCombatSession(mockReducer);
      const command = createTestCommand(scenario, (cmd) => ({ ...cmd, actor: 'flux:actor:nonexistent' }));
      wrappedReducer(context, command);

      expect(mockReducer).not.toHaveBeenCalled();
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain(ErrorCode.FORBIDDEN);
    });
  });

  describe('withPreventCrossSessionTargeting', () => {
    it('should allow targeting when both actors are in same session', () => {
      const wrappedReducer = withPreventCrossSessionTargeting(mockReducer);
      const command = createTestCommand(scenario, (cmd) => ({ ...cmd, actor: ALICE_ID, args: { target: BOB_ID } }));
      wrappedReducer(context, command, scenario.session);
      const result = wrappedReducer(context, command, scenario.session);

      expect(mockReducer).toHaveBeenCalledWith(context, command, scenario.session);
      expect(errors).toHaveLength(0);
      expect(result).toBe(context);
    });


    it('should block targeting actors in different sessions', () => {
      const wrappedReducer = withPreventCrossSessionTargeting(mockReducer);
      const command = createTestCommand(scenario, (cmd) => ({ ...cmd, actor: ALICE_ID, args: { target: CHARLIE_ID } }));

      const result = wrappedReducer(context, command, scenario.session);

      expect(mockReducer).not.toHaveBeenCalled();
      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatch(/target.*not.*found|different.*session/i);
      expect(result).toBe(context);
    });


    it('should block targeting actors outside combat when in combat', () => {
      const wrappedReducer = withPreventCrossSessionTargeting(mockReducer);
      const command = createTestCommand(scenario, (cmd) => ({ ...cmd, actor: ALICE_ID, args: { target: DAVE_ID } }));
      const result = wrappedReducer(context, command, scenario.session);

      expect(mockReducer).not.toHaveBeenCalled();
      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatch(/target.*not.*found|outside.*session/i);
      expect(result).toBe(context);
    });

    it('should handle optional targets when not provided', () => {
      const wrappedReducer = withPreventCrossSessionTargeting(mockReducer, true);
      const command = createTestCommand(scenario, (cmd) => ({ ...cmd, actor: ALICE_ID, args: {} }));
      const result = wrappedReducer(context, command, scenario.session);
      expect(mockReducer).toHaveBeenCalledWith(context, command, scenario.session);
      expect(errors).toHaveLength(0);
      expect(result).toBe(context);
    });

    it('should require target when not optional', () => {
      const wrappedReducer = withPreventCrossSessionTargeting(mockReducer, false);
      const command: TestCommand = createTestCommand(scenario, (cmd) => ({ ...cmd, actor: ALICE_ID, args: {} }));
      const result = wrappedReducer(context, command, scenario.session);

      expect(mockReducer).not.toHaveBeenCalled();
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Target is required');
      expect(result).toBe(context);
    });
  });


  describe('Decorator Composition', () => {
    it('should allow manual composition of decorators', () => {
      const composedReducer = withExistingCombatSession(
        withPreventCrossSessionTargeting(mockReducer)
      );
      const command: TestCommand = createTestCommand(scenario, (cmd) => ({ ...cmd, actor: ALICE_ID, args: { target: BOB_ID } }));

      const result = composedReducer(context, command);
      expect(mockReducer).toHaveBeenCalledWith(context, command, scenario.session);
      expect(errors).toHaveLength(0);
      expect(result).toBe(context);
    });

    it('should maintain proper error precedence in composition', () => {
      const composedReducer = withExistingCombatSession(
        withPreventCrossSessionTargeting(mockReducer)
      );
      const command: TestCommand = createTestCommand(scenario, (cmd) => ({ ...cmd, actor: DAVE_ID, args: { target: CHARLIE_ID } }));

      const result = composedReducer(context, command);

      expect(mockReducer).not.toHaveBeenCalled();
      expect(errors).toHaveLength(1);
      // Should fail on the first validation (required combat session)
      expect(errors[0]).toContain(ErrorCode.FORBIDDEN);
      expect(result).toBe(context);
    });
  });
});
