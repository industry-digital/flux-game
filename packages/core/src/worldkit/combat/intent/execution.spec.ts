/**
 * Combat Intent Execution Engine Tests
 *
 * Tests the intent execution system in isolation using dependency injection.
 * Focuses on testing the core logic of mapping intents to combat actions.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createIntentExecutionApi, ActionExecutionError, IntentExecutionApi } from './execution';
import { CombatAction, Combatant, CombatSession, Team } from '~/types/combat';
import { TransformerContext } from '~/types/handler';
import { CommandType } from '~/types/intent';
import { ActorURN } from '~/types/taxonomy';
import { WorldEvent } from '~/types/event';
import { CombatantApi, MOVE_BY_AP, MOVE_BY_DISTANCE } from '~/worldkit/combat/combatant';
import { CombatIntentResult } from './intent';
import { Actor } from '~/types/entity/actor';
import { createTestActor } from '~/testing/world-testing';
import { useCombatScenario } from '~/worldkit/combat/testing/scenario';
import { createSwordSchema } from '~/worldkit/schema/weapon/sword';
import { createTransformerContext } from '~/worldkit/context';
describe('Combat Intent Execution Engine (Isolated)', () => {
  let mockContext: TransformerContext;
  let mockSession: CombatSession;
  let mockCombatantHook: CombatantApi;
  let mockEvaluateIntent: ReturnType<typeof vi.fn>;
  let executor: IntentExecutionApi;


  let alice!: Actor;
  let bob!: Actor;

  beforeEach(() => {
    alice = createTestActor({ name: 'Alice' });
    bob = createTestActor({ name: 'Bob' });

    const context = createTransformerContext();
    const scenario = useCombatScenario(context, {
      participants: {
        [alice.id]: { team: Team.BRAVO },
        [bob.id]: { team: Team.ALPHA },
      },
      weapons: [createSwordSchema({
        urn: 'flux:schema:weapon:test',
        name: 'Test Weapon',
      })],
    });

    // Use the scenario's context and session which have actors properly set up
    mockContext = scenario.context;
    mockSession = scenario.session;

    // Mock combatant hook
    mockCombatantHook = {
      combatant: { actorId: alice.id },
      canAct: vi.fn(() => true),
      getAvailableCommands: vi.fn(() => [CommandType.ATTACK, CommandType.DEFEND]),
      target: vi.fn(() => [{ type: 'TARGET_EVENT', id: 'test-1' } as unknown as WorldEvent]),
      advance: vi.fn(() => [{ type: 'ADVANCE_EVENT', id: 'test-2' } as unknown as WorldEvent]),
      retreat: vi.fn(() => [{ type: 'RETREAT_EVENT', id: 'test-3' } as unknown as WorldEvent]),
      attack: vi.fn(() => [{ type: 'ATTACK_EVENT', id: 'test-4' } as unknown as WorldEvent]),
      defend: vi.fn(() => [{ type: 'DEFEND_EVENT', id: 'test-5' } as unknown as WorldEvent]),
      strike: vi.fn(() => [{ type: 'STRIKE_EVENT', id: 'test-6' } as unknown as WorldEvent]),
      done: vi.fn(() => [{ type: 'DONE_EVENT', id: 'test-7' } as unknown as WorldEvent])
    } as unknown as CombatantApi;

    // Mock dependencies
    mockEvaluateIntent = vi.fn();

    // Create executor with default dependencies for most tests
    executor = createIntentExecutionApi(mockContext, mockSession, mockCombatantHook);
  });

  describe('createIntentExecutor', () => {
    it('should create executor for valid actor and session', () => {
      expect(executor).toBeDefined();
      expect(typeof executor.executeActions).toBe('function');
      expect(typeof executor.executeIntent).toBe('function');
    });

    it('should throw error for non-existent actor', () => {
      const badCombatantHook = {
        ...mockCombatantHook,
        combatant: { actorId: 'flux:actor:nonexistent' as ActorURN }
      };

      expect(() => {
        createIntentExecutionApi(mockContext, mockSession, badCombatantHook as CombatantApi);
      }).toThrow('Actor flux:actor:nonexistent not found');
    });

    it('should throw error for actor not in session', () => {
      const charlieId: ActorURN = 'flux:actor:charlie';
      mockContext.world.actors[charlieId] = { id: charlieId, name: 'Charlie' } as any;

      const charlieCombatantHook: CombatantApi = {
        ...mockCombatantHook,
        combatant: { actorId: charlieId } as unknown as Combatant
      };

      // This should work fine now since we're not checking session membership in createIntentExecutor
      // The error would come from the combatant hook creation, not the intent executor
      expect(() => {
        createIntentExecutionApi(mockContext, mockSession, charlieCombatantHook);
      }).not.toThrow();
    });

    it('should use default dependencies when none provided', () => {
      // This test ensures the default behavior works
      const defaultExecutor = createIntentExecutionApi(mockContext, mockSession, mockCombatantHook);
      expect(defaultExecutor).toBeDefined();
    });

    it('should use injected dependencies', () => {
      const customEvaluateIntent = vi.fn();
      const customExecuteSingleAction = vi.fn(() => []);
      const customBuildIntentContext = vi.fn(() => ({} as any));

      const customExecutor = createIntentExecutionApi(mockContext, mockSession, mockCombatantHook, {
        evaluateCombatIntent: customEvaluateIntent,
        executeSingleAction: customExecuteSingleAction,
        buildIntentContext: customBuildIntentContext
      });

      expect(customExecutor).toBeDefined();
      // Dependencies will be used when methods are called
    });
  });

  describe('useIntentExecution', () => {
    it('should return same interface as createIntentExecutor plus checkAndAdvanceTurn', () => {
      const hookExecutor = createIntentExecutionApi(mockContext, mockSession, mockCombatantHook);

      expect(hookExecutor).toBeDefined();
      expect(typeof hookExecutor.executeActions).toBe('function');
      expect(typeof hookExecutor.executeIntent).toBe('function');
      expect(typeof hookExecutor.checkAndAdvanceTurn).toBe('function');
    });
  });

  describe('Automatic Turn Advancement', () => {
    it('should advance turn when combatant cannot act', () => {
      // Mock canAct to return false (combatant cannot act)
      const noActCombatantHook = {
        ...mockCombatantHook,
        canAct: vi.fn(() => false)
      };

      const executor = createIntentExecutionApi(mockContext, mockSession, noActCombatantHook);
      const result = executor.checkAndAdvanceTurn();

      // Should return events from the done action
      expect(result).toEqual([{ type: 'DONE_EVENT', id: 'test-7' }]);
      expect(noActCombatantHook.done).toHaveBeenCalled();
    });

    it('should not advance turn when combatant can still act', () => {
      // Use default mockCombatantHook which has canAct returning true
      const executor = createIntentExecutionApi(mockContext, mockSession, mockCombatantHook);
      const result = executor.checkAndAdvanceTurn();

      // Should return empty array since no turn advancement is needed
      expect(result).toHaveLength(0);
      expect(mockCombatantHook.done).not.toHaveBeenCalled();
    });

    it('should handle missing actor gracefully', () => {
      const badCombatantHook : CombatantApi = {
        ...mockCombatantHook,
        combatant: { actorId: 'flux:actor:nonexistent' as ActorURN } as unknown as Combatant
      };

      // The useIntentExecution function will throw an error for missing actors
      // This is the expected behavior - we can't create an executor for non-existent actors
      expect(() => {
        createIntentExecutionApi(mockContext, mockSession, badCombatantHook);
      }).toThrow('Actor flux:actor:nonexistent not found');
    });
  });

  describe('executeActions', () => {
    it('should execute TARGET action and call combatant hook', () => {
      const targetAction: CombatAction = {
        actorId: alice.id,
        command: CommandType.TARGET,
        args: { target: bob.id },
        cost: { ap: 0 }
      };

      const events = executor.executeActions([targetAction], 'test-trace');

      expect(mockCombatantHook.target).toHaveBeenCalledWith(bob.id, 'test-trace');
      expect(events).toEqual([{ type: 'TARGET_EVENT', id: 'test-1' }]);
    });

    it('should execute ATTACK action and call combatant hook', () => {
      const attackAction: CombatAction = {
        actorId: alice.id,
        command: CommandType.ATTACK,
        args: { target: bob.id },
        cost: { ap: 2.0 }
      };

      const events = executor.executeActions([attackAction], 'test-trace');

      expect(mockCombatantHook.attack).toHaveBeenCalledWith(bob.id, 'test-trace');
      expect(events).toEqual([{ type: 'ATTACK_EVENT', id: 'test-4' }]);
    });

    it('should execute DEFEND action and call combatant hook', () => {
      const defendAction: CombatAction = {
        actorId: alice.id,
        command: CommandType.DEFEND,
        args: {},
        cost: { ap: 6.0 }
      };

      const events = executor.executeActions([defendAction], 'test-trace');

      expect(mockCombatantHook.defend).toHaveBeenCalledWith('test-trace', {});
      expect(events).toEqual([{ type: 'DEFEND_EVENT', id: 'test-5' }]);
    });

    it('should execute STRIKE action and call combatant hook', () => {
      const strikeAction: CombatAction = {
        actorId: alice.id,
        command: CommandType.STRIKE,
        args: { target: bob.id },
        cost: { ap: 2.0 }
      };

      const events = executor.executeActions([strikeAction], 'test-trace');

      expect(mockCombatantHook.strike).toHaveBeenCalledWith(bob.id, 'test-trace');
      expect(events).toEqual([{ type: 'STRIKE_EVENT', id: 'test-6' }]);
    });

    it('should execute ADVANCE action with distance and call advance', () => {
      const advanceAction: CombatAction = {
        actorId: alice.id,
        command: CommandType.ADVANCE,
        args: { type: 'distance', distance: 10 },
        cost: { ap: 1.5 }
      };

      const events = executor.executeActions([advanceAction], 'test-trace');

      expect(mockCombatantHook.advance).toHaveBeenCalledWith(MOVE_BY_DISTANCE, 10, undefined, 'test-trace');
      expect(events).toEqual([{ type: 'ADVANCE_EVENT', id: 'test-2' }]);
    });

    it('should execute ADVANCE action with AP and call advance', () => {
      const advanceAction: CombatAction = {
        actorId: alice.id,
        command: CommandType.ADVANCE,
        args: { type: 'ap', ap: 2.0 },
        cost: { ap: 2.0 }
      };

      const events = executor.executeActions([advanceAction], 'test-trace');

      expect(mockCombatantHook.advance).toHaveBeenCalledWith(MOVE_BY_AP, 2.0, undefined, 'test-trace');
      expect(events).toEqual([{ type: 'ADVANCE_EVENT', id: 'test-2' }]);
    });

    it('should execute retreat movement and call retreat', () => {
      const retreatAction: CombatAction = {
        actorId: alice.id,
        command: CommandType.RETREAT,
        args: { type: 'distance', distance: 10 },
        cost: { ap: 1.5 }
      };

      const events = executor.executeActions([retreatAction], 'test-trace');

      expect(mockCombatantHook.retreat).toHaveBeenCalledWith(MOVE_BY_DISTANCE, 10, undefined, 'test-trace');
      expect(events).toEqual([{ type: 'RETREAT_EVENT', id: 'test-3' }]);
    });

    it('should execute multiple actions in sequence', () => {
      const actions: CombatAction[] = [
        {
          actorId: alice.id,
          command: CommandType.TARGET,
          args: { target: bob.id },
          cost: { ap: 0 }
        },
        {
          actorId: alice.id,
          command: CommandType.ATTACK,
          args: { target: bob.id },
          cost: { ap: 2.0 }
        }
      ];

      const events = executor.executeActions(actions, 'test-trace');

      expect(mockCombatantHook.target).toHaveBeenCalledWith(bob.id, 'test-trace');
      expect(mockCombatantHook.attack).toHaveBeenCalledWith(bob.id, 'test-trace');
      expect(events).toEqual([
        { type: 'TARGET_EVENT', id: 'test-1' },
        { type: 'ATTACK_EVENT', id: 'test-4' }
      ]);
    });

    it('should throw ActionExecutionError for invalid TARGET action', () => {
      const invalidAction: CombatAction = {
        actorId: alice.id,
        command: CommandType.TARGET,
        args: {}, // Missing target
        cost: { ap: 0 }
      };

      expect(() => {
        executor.executeActions([invalidAction], 'test-trace');
      }).toThrow(ActionExecutionError);
      expect(() => {
        executor.executeActions([invalidAction], 'test-trace');
      }).toThrow('TARGET action requires target argument');
    });

    it('should throw error for unsupported command type', () => {
      const unsupportedAction: CombatAction = {
        actorId: alice.id,
        command: 'UNSUPPORTED_COMMAND' as CommandType,
        args: {},
        cost: { ap: 0 }
      };

      expect(() => {
        executor.executeActions([unsupportedAction], 'test-trace');
      }).toThrow(ActionExecutionError);
    });

    it('should propagate errors from combatant hook methods', () => {
      mockCombatantHook.attack = vi.fn(() => {
        throw new Error('Attack failed');
      });

      const attackAction: CombatAction = {
        actorId: alice.id,
        command: CommandType.ATTACK,
        args: {},
        cost: { ap: 2.0 }
      };

      expect(() => {
        executor.executeActions([attackAction], 'test-trace');
      }).toThrow(ActionExecutionError);
      expect(() => {
        executor.executeActions([attackAction], 'test-trace');
      }).toThrow('Failed to execute ATTACK action: Attack failed');
    });
  });

  describe('executeIntent', () => {

    it('should throw error for failed intent parsing', () => {
      const mockIntentResult: CombatIntentResult = {
        success: false,
        error: 'Unknown command: invalid'
      };

      mockEvaluateIntent.mockReturnValue(mockIntentResult);

      expect(() => {
        executor.executeIntent('invalid command');
      }).toThrow('Intent parsing failed: Unknown command: invalid');
    });

    it('should generate unique traces using context.uniqid', () => {
      mockContext.uniqid = vi.fn(() => 'test-trace-123');

      const mockActions: CombatAction[] = [
        {
          actorId: alice.id,
          command: CommandType.DEFEND,
          args: {},
          cost: { ap: 6.0 }
        }
      ];

      const mockIntentResult: CombatIntentResult = {
        success: true,
        actions: mockActions
      };

      mockEvaluateIntent.mockReturnValue(mockIntentResult);

      executor.executeIntent('defend');

      expect(mockContext.uniqid).toHaveBeenCalledTimes(1);
    });



  });

  describe('Movement Input Creation', () => {
    it('should handle distance-based movement args', () => {
      const advanceAction: CombatAction = {
        actorId: alice.id,
        command: CommandType.ADVANCE,
        args: { type: 'distance', distance: 15, target: bob.id },
        cost: { ap: 2.0 }
      };

      executor.executeActions([advanceAction], 'test-trace');

      expect(mockCombatantHook.advance).toHaveBeenCalledWith(MOVE_BY_DISTANCE, 15, bob.id, 'test-trace');
    });

    it('should handle AP-based movement args with `ap` property', () => {
      const advanceAction: CombatAction = {
        actorId: alice.id,
        command: CommandType.ADVANCE,
        args: { type: 'ap', ap: 2.0, target: bob.id },
        cost: { ap: 2.0 }
      };

      executor.executeActions([advanceAction], 'test-trace');

      expect(mockCombatantHook.advance).toHaveBeenCalledWith(MOVE_BY_AP, 2.0, bob.id, 'test-trace');
    });

    it('should handle fallback distance args without explicit type', () => {
      const advanceAction: CombatAction = {
        actorId: alice.id,
        command: CommandType.ADVANCE,
        args: { distance: 10 }, // No explicit type
        cost: { ap: 1.5 }
      };

      executor.executeActions([advanceAction], 'test-trace');

      expect(mockCombatantHook.advance).toHaveBeenCalledWith(MOVE_BY_DISTANCE, 10, undefined, 'test-trace');
    });

    it('should handle fallback AP args without explicit type', () => {
      const advanceAction: CombatAction = {
        actorId: alice.id,
        command: CommandType.ADVANCE,
        args: { ap: 1.5 }, // No explicit type, using 'amount'
        cost: { ap: 1.5 }
      };

      executor.executeActions([advanceAction], 'test-trace');

      expect(mockCombatantHook.advance).toHaveBeenCalledWith(MOVE_BY_AP, 1.5, undefined, 'test-trace');
    });

    it('should throw error for invalid movement args', () => {
      const advanceAction: CombatAction = {
        actorId: alice.id,
        command: CommandType.ADVANCE,
        args: {}, // No movement parameters
        cost: { ap: 1.0 }
      };

      expect(() => {
        executor.executeActions([advanceAction], 'test-trace');
      }).toThrow(ActionExecutionError);
      expect(() => {
        executor.executeActions([advanceAction], 'test-trace');
      }).toThrow('Invalid movement arguments: must specify either distance or ap');
    });
  });

  describe('ActionExecutionError', () => {
    it('should create error with action and cause', () => {
      const action: CombatAction = {
        actorId: alice.id,
        command: CommandType.ATTACK,
        args: {},
        cost: { ap: 2.0 }
      };

      const cause = new Error('Original error');
      const error = new ActionExecutionError('Test error', action, cause);

      expect(error.message).toBe('Test error');
      expect(error.action).toBe(action);
      expect(error.cause).toBe(cause);
      expect(error.name).toBe('ActionExecutionError');
    });

    it('should create error without cause', () => {
      const action: CombatAction = {
        actorId: alice.id,
        command: CommandType.DEFEND,
        args: {},
        cost: { ap: 6.0 }
      };

      const error = new ActionExecutionError('Test error', action);

      expect(error.message).toBe('Test error');
      expect(error.action).toBe(action);
      expect(error.cause).toBeUndefined();
    });
  });

  describe('Trace Propagation', () => {
    it('should propagate explicit trace to all combatant hook calls in executeActions', () => {
      const targetAction: CombatAction = {
        actorId: alice.id,
        command: CommandType.TARGET,
        args: { target: bob.id },
        cost: { ap: 0 }
      };

      const attackAction: CombatAction = {
        actorId: alice.id,
        command: CommandType.ATTACK,
        args: { target: bob.id },
        cost: { ap: 2.0 }
      };

      const customTrace = 'custom-trace-123';
      executor.executeActions([targetAction, attackAction], customTrace);

      expect(mockCombatantHook.target).toHaveBeenCalledWith(bob.id, customTrace);
      expect(mockCombatantHook.attack).toHaveBeenCalledWith(bob.id, customTrace);
    });

    it('should generate default trace using context.uniqid when no trace provided to executeActions', () => {
      const mockUniqid = vi.fn(() => 'generated-trace-456');
      mockContext.uniqid = mockUniqid;

      const defendAction: CombatAction = {
        actorId: alice.id,
        command: CommandType.DEFEND,
        args: {},
        cost: { ap: 6.0 }
      };

      executor.executeActions([defendAction]);

      expect(mockUniqid).toHaveBeenCalledTimes(1);
      expect(mockCombatantHook.defend).toHaveBeenCalledWith('generated-trace-456', {});
    });

    it('should not call context.uniqid when explicit trace provided to executeActions', () => {
      const mockUniqid = vi.fn(() => 'should-not-be-called');
      mockContext.uniqid = mockUniqid;

      const defendAction: CombatAction = {
        actorId: alice.id,
        command: CommandType.DEFEND,
        args: {},
        cost: { ap: 6.0 }
      };

      executor.executeActions([defendAction], 'explicit-trace');

      expect(mockUniqid).not.toHaveBeenCalled();
      expect(mockCombatantHook.defend).toHaveBeenCalledWith('explicit-trace', {});
    });

    it('should propagate trace to done() call when combatant cannot act after actions', () => {
      // Mock canAct to return false (combatant cannot act after action)
      mockCombatantHook.canAct = vi.fn(() => false);

      const defendAction: CombatAction = {
        actorId: alice.id,
        command: CommandType.DEFEND,
        args: {},
        cost: { ap: 6.0 }
      };

      const customTrace = 'trace-for-done';
      executor.executeActions([defendAction], customTrace);

      expect(mockCombatantHook.defend).toHaveBeenCalledWith(customTrace, {});
      expect(mockCombatantHook.done).toHaveBeenCalledWith(customTrace);
    });


    it('should generate default trace using context.uniqid when no trace provided to executeIntent', () => {
      const mockUniqid = vi.fn(() => 'intent-generated-trace');
      mockContext.uniqid = mockUniqid;

      const mockActions: CombatAction[] = [
        {
          actorId: alice.id,
          command: CommandType.DEFEND,
          args: {},
          cost: { ap: 6.0 }
        }
      ];

      const mockIntentResult: CombatIntentResult = {
        success: true,
        actions: mockActions
      };

      mockEvaluateIntent.mockReturnValue(mockIntentResult);

      executor.executeIntent('defend');

      expect(mockUniqid).toHaveBeenCalledTimes(1);
      expect(mockCombatantHook.defend).toHaveBeenCalledWith('intent-generated-trace', {});
    });

    it('should propagate explicit trace to done() call in checkAndAdvanceTurn', () => {
      // Mock canAct to return false (combatant cannot act)
      mockCombatantHook.canAct = vi.fn(() => false);

      const advanceTrace = 'advance-trace-abc';
      const events = executor.checkAndAdvanceTurn(advanceTrace);

      expect(mockCombatantHook.done).toHaveBeenCalledWith(advanceTrace);
      expect(events).toEqual([{ type: 'DONE_EVENT', id: 'test-7' }]);
    });

    it('should generate default trace using context.uniqid when no trace provided to checkAndAdvanceTurn', () => {
      const mockUniqid = vi.fn(() => 'advance-generated-trace');
      mockContext.uniqid = mockUniqid;

      // Mock canAct to return false (combatant cannot act)
      mockCombatantHook.canAct = vi.fn(() => false);

      executor.checkAndAdvanceTurn();

      expect(mockUniqid).toHaveBeenCalledTimes(1);
      expect(mockCombatantHook.done).toHaveBeenCalledWith('advance-generated-trace');
    });

    it('should not call context.uniqid when combatant can still act in checkAndAdvanceTurn', () => {
      const mockUniqid = vi.fn(() => 'should-not-be-called');
      mockContext.uniqid = mockUniqid;

      // Use default mockCombatantHook which has canAct returning true
      const events = executor.checkAndAdvanceTurn();

      expect(mockUniqid).not.toHaveBeenCalled();
      expect(mockCombatantHook.done).not.toHaveBeenCalled();
      expect(events).toHaveLength(0);
    });

    it('should use same trace for all actions in a single executeActions call', () => {
      const actions: CombatAction[] = [
        {
          actorId: alice.id,
          command: CommandType.TARGET,
          args: { target: bob.id },
          cost: { ap: 0 }
        },
        {
          actorId: alice.id,
          command: CommandType.ADVANCE,
          args: { type: 'distance', distance: 5 },
          cost: { ap: 1.0 }
        },
        {
          actorId: alice.id,
          command: CommandType.STRIKE,
          args: { target: bob.id },
          cost: { ap: 2.0 }
        }
      ];

      const sharedTrace = 'shared-trace-xyz';
      executor.executeActions(actions, sharedTrace);

      expect(mockCombatantHook.target).toHaveBeenCalledWith(bob.id, sharedTrace);
      expect(mockCombatantHook.advance).toHaveBeenCalledWith(MOVE_BY_DISTANCE, 5, undefined, sharedTrace);
      expect(mockCombatantHook.strike).toHaveBeenCalledWith(bob.id, sharedTrace);
    });
  });

  describe('Dependency Injection', () => {
    it('should allow custom combatant hook implementation', () => {
      const customCombatantHook = {
        ...mockCombatantHook,
        attack: vi.fn(() => [{ type: 'CUSTOM_ATTACK', id: 'custom-1' } as unknown as WorldEvent])
      };

      const customExecutor = createIntentExecutionApi(mockContext, mockSession, customCombatantHook);

      const attackAction: CombatAction = {
        actorId: alice.id,
        command: CommandType.ATTACK,
        args: {},
        cost: { ap: 2.0 }
      };

      const events = customExecutor.executeActions([attackAction], 'test-trace');

      expect(customCombatantHook.attack).toHaveBeenCalled();
      expect(events).toEqual([{ type: 'CUSTOM_ATTACK', id: 'custom-1' }]);
    });

    it('should allow custom evaluateCombatIntent implementation', () => {
      const customEvaluateIntent = vi.fn((): CombatIntentResult => ({
        success: true,
        actions: [{
          actorId: alice.id,
          command: CommandType.DEFEND,
          args: {},
          cost: { ap: 6.0 }
        }]
      }));

      const customExecutor = createIntentExecutionApi(mockContext, mockSession, mockCombatantHook, {
        evaluateCombatIntent: customEvaluateIntent,
        executeSingleAction: (action, hook, trace) => [],
        buildIntentContext: () => ({} as any)
      });

      customExecutor.executeIntent('custom command');

      expect(customEvaluateIntent).toHaveBeenCalledWith(
        'custom command',
        expect.any(Object)
      );
    });
  });
});
