import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  withExistingCombatSession,
  withPreventCrossSessionTargeting,
  withCombatSessionAndTarget,
} from './validation';
import { useCombatScenario } from './testing/scenario';
import { createTransformerContext } from '~/worldkit/context';
import { ActorURN, PlaceURN } from '~/types/taxonomy';
import { CommandType, Command } from '~/types/intent';
import { Team } from '~/types/combat';
import { createTestActor } from '~/testing/world-testing';

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

    // @ts-expect-error - id is optional
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
      sessions: {}, // No combat sessions
    };

    // Mock reducer
    mockReducer = vi.fn((ctx, cmd) => ctx);
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

      expect(mockReducer).toHaveBeenCalledWith(context, command);
      expect(errors).toHaveLength(0);
      expect(result).toBe(context);
    });

    it('should block commands when actor has no combat session', () => {
      const wrappedReducer = withExistingCombatSession(mockReducer);
      const command = createTestCommand(scenario, (cmd) => ({ ...cmd, actor: DAVE_ID }));
      const result = wrappedReducer(context, command);

      expect(mockReducer).not.toHaveBeenCalled();
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Combat session required');
      expect(result).toBe(context);
    });

    it('should block commands when actor does not exist', () => {
      const wrappedReducer = withExistingCombatSession(mockReducer);
      const command = createTestCommand(scenario, (cmd) => ({ ...cmd, actor: 'flux:actor:nonexistent' }));
      wrappedReducer(context, command);

      expect(mockReducer).not.toHaveBeenCalled();
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Combat session required');
    });
  });

  describe('withPreventCrossSessionTargeting', () => {
    it('should allow targeting when both actors are in same session', () => {
      const wrappedReducer = withPreventCrossSessionTargeting(mockReducer);
      const command = createTestCommand(scenario, (cmd) => ({ ...cmd, actor: ALICE_ID, args: { target: BOB_ID } }));
      wrappedReducer(context, command);
      const result = wrappedReducer(context, command);

      expect(mockReducer).toHaveBeenCalledWith(context, command);
      expect(errors).toHaveLength(0);
      expect(result).toBe(context);
    });

    it('should allow targeting when both actors have no session', () => {
      const wrappedReducer = withPreventCrossSessionTargeting(mockReducer);
      const command = createNonCombatCommand((cmd) => ({ ...cmd, actor: DAVE_ID, args: { target: 'flux:actor:eve' as ActorURN } }));

      // Add eve to world with no session
      const eve = createTestActor({
        id: 'flux:actor:eve' as ActorURN,
        name: 'Eve',
        location: 'flux:place:arena' as PlaceURN,
      });
      eve.sessions = {}; // Ensure no sessions
      context.world.actors[eve.id] = eve;

      const result = wrappedReducer(context, command);

      expect(mockReducer).toHaveBeenCalledWith(context, command);
      expect(errors).toHaveLength(0);
      expect(result).toBe(context);
    });

    it('should block targeting actors in different sessions', () => {
      const wrappedReducer = withPreventCrossSessionTargeting(mockReducer);
      const command = createTestCommand(scenario, (cmd) => ({ ...cmd, actor: ALICE_ID, args: { target: CHARLIE_ID } }));

      const result = wrappedReducer(context, command);

      expect(mockReducer).not.toHaveBeenCalled();
      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatch(/target.*not.*found|different.*session/i);
      expect(result).toBe(context);
    });

    it('should block targeting actors in combat when not in combat', () => {
      const wrappedReducer = withPreventCrossSessionTargeting(mockReducer);
      const command = createNonCombatCommand((cmd) => ({ ...cmd, actor: DAVE_ID, args: { target: ALICE_ID } }));

      const result = wrappedReducer(context, command);

      expect(mockReducer).not.toHaveBeenCalled();
      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatch(/target.*not.*found|already.*combat|session.*not.*found/i);
      expect(result).toBe(context);
    });

    it('should block targeting actors outside combat when in combat', () => {
      const wrappedReducer = withPreventCrossSessionTargeting(mockReducer);
      const command = createTestCommand(scenario, (cmd) => ({ ...cmd, actor: ALICE_ID, args: { target: DAVE_ID } }));
      const result = wrappedReducer(context, command);

      expect(mockReducer).not.toHaveBeenCalled();
      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatch(/target.*not.*found|outside.*session/i);
      expect(result).toBe(context);
    });

    it('should handle optional targets when not provided', () => {
      const wrappedReducer = withPreventCrossSessionTargeting(mockReducer, true);
      const command = createTestCommand(scenario, (cmd) => ({ ...cmd, actor: ALICE_ID, args: {} }));
      const result = wrappedReducer(context, command);
      expect(mockReducer).toHaveBeenCalledWith(context, command);
      expect(errors).toHaveLength(0);
      expect(result).toBe(context);
    });

    it('should require target when not optional', () => {
      const wrappedReducer = withPreventCrossSessionTargeting(mockReducer, false);
      const command: TestCommand = createTestCommand(scenario, (cmd) => ({ ...cmd, actor: ALICE_ID, args: {} }));
      const result = wrappedReducer(context, command);

      expect(mockReducer).not.toHaveBeenCalled();
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Target is required');
      expect(result).toBe(context);
    });
  });

  describe('withCombatSessionAndTarget', () => {
    it('should compose both validations successfully', () => {
      const wrappedReducer = withCombatSessionAndTarget(mockReducer);
      const command: TestCommand = createTestCommand(scenario, (cmd) => ({ ...cmd, actor: ALICE_ID, args: { target: BOB_ID } }));
      const result = wrappedReducer(context, command);

      expect(mockReducer).toHaveBeenCalledWith(context, command);
      expect(errors).toHaveLength(0);
      expect(result).toBe(context);
    });

    it('should fail if actor has no combat session', () => {
      const wrappedReducer = withCombatSessionAndTarget(mockReducer);
      const command: TestCommand = createTestCommand(scenario, (cmd) => ({ ...cmd, actor: DAVE_ID, args: { target: ALICE_ID } }));
      const result = wrappedReducer(context, command);

      expect(mockReducer).not.toHaveBeenCalled();
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Combat session required');
      expect(result).toBe(context);
    });

    it('should fail if target is in different session', () => {
      const wrappedReducer = withCombatSessionAndTarget(mockReducer);
      const command: TestCommand = createTestCommand(scenario, (cmd) => ({ ...cmd, actor: ALICE_ID, args: { target: CHARLIE_ID } }));

      const result = wrappedReducer(context, command);

      expect(mockReducer).not.toHaveBeenCalled();
      expect(errors).toHaveLength(1);
      // Since Alice is in combat, the targeting validation fails first
      expect(errors[0]).toMatch(/target.*not.*found|different.*session/i);
      expect(result).toBe(context);
    });

    it('should handle optional targets', () => {
      const wrappedReducer = withCombatSessionAndTarget(mockReducer, true);
      const command: TestCommand = createTestCommand(scenario, (cmd) => ({ ...cmd, actor: ALICE_ID, args: {} }));
      const result = wrappedReducer(context, command);

      expect(mockReducer).toHaveBeenCalledWith(context, command);
      expect(errors).toHaveLength(0);
      expect(result).toBe(context);
    });
  });

  describe('Decorator Composition', () => {
    it('should allow manual composition of decorators', () => {
      const manuallyComposed = withExistingCombatSession(
        withPreventCrossSessionTargeting(mockReducer)
      );
      const convenientComposed = withCombatSessionAndTarget(mockReducer);
      const command: TestCommand = createTestCommand(scenario, (cmd) => ({ ...cmd, actor: ALICE_ID, args: { target: BOB_ID } }));

      // Both should behave identically and both should call the reducer
      const result1 = manuallyComposed(context, command);
      expect(mockReducer).toHaveBeenCalledTimes(1);

      mockReducer.mockClear();
      errors.length = 0;

      const result2 = convenientComposed(context, command);
      expect(mockReducer).toHaveBeenCalledTimes(1);

      expect(result1).toBe(result2);
    });

    it('should maintain proper error precedence in composition', () => {
      const wrappedReducer = withCombatSessionAndTarget(mockReducer);
      const command: TestCommand = createTestCommand(scenario, (cmd) => ({ ...cmd, actor: DAVE_ID, args: { target: CHARLIE_ID } }));

      const result = wrappedReducer(context, command);

      expect(mockReducer).not.toHaveBeenCalled();
      expect(errors).toHaveLength(1);
      // Should fail on the first validation (required combat session)
      expect(errors[0]).toContain('Combat session required');
      expect(result).toBe(context);
    });
  });
});
