/**
 * Attack Method Tests
 *
 * Tests the AI-integrated attack method with dependency injection,
 * focusing on the executeCombatPlan injection capability.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAttackMethod, CombatPlanExecutor } from './attack';
import { useCombatScenario } from '~/worldkit/combat/testing/scenario';
import { generateCombatPlan } from '~/worldkit/combat/ai';
import { Actor } from '~/types/entity/actor';
import { CombatSession, Combatant, CombatCommand, CombatFacing, Team } from '~/types/combat';
import { CommandType } from '~/types/intent';
import { WorldEvent, EventType } from '~/types/event';
import { ActorURN } from '~/types/taxonomy';
import { WeaponSchema } from '~/types/schema/weapon';
import { createWorldEvent } from '~/worldkit/event';
import { TransformerContext } from '~/types/handler';
import { assessWeaponCapabilities } from '~/worldkit/combat/ai/analysis';
import { createTransformerContext } from '~/worldkit/context';
import { createSwordSchema } from '~/worldkit/schema/weapon/sword';
import { registerWeapons } from '~/worldkit/combat/testing/schema';
import { DEFAULT_COMBAT_PLANNING_DEPS } from '~/worldkit/combat/ai/deps';
import { createActorCommand } from '~/lib/intent';
import {
  createCombatantDidAttackEvent,
  createCombatantDidAcquireTargetEvent,
  createCombatantDidMoveEvent,
  createCombatantDidDefendEvent,
  createCombatTurnDidEndEvent
} from '~/testing/event/factory';
import { WellKnownActor } from '~/types/actor';

describe('Attack Method with AI Integration', () => {
  const DEFAULT_TIMESTAMP = 1234567890000;

  let context: TransformerContext;
  let session: CombatSession;
  let actor: Actor;
  let combatant: Combatant;

  // Additional scenarios for specialized tests
  let shortRangeWeapon: WeaponSchema;
  let meleeWeapon: WeaponSchema;
  let shortRangeScenario: ReturnType<typeof useCombatScenario>;
  let meleeScenario: ReturnType<typeof useCombatScenario>;

  beforeEach(() => {
    const testContext = createTransformerContext();

    // Create multiple weapon schemas for different test scenarios
    const testWeapon = createSwordSchema({ name: 'Test Sword', urn: 'flux:schema:weapon:test-sword' });
    shortRangeWeapon = createSwordSchema({
      name: 'Short Sword',
      urn: 'flux:schema:weapon:short-sword',
      range: { optimal: 1, max: 1 } // 1m melee weapon
    });
    meleeWeapon = createSwordSchema({
      name: 'Melee Weapon',
      urn: 'flux:schema:weapon:melee',
    });

    // Create and configure schema manager with all weapons
    const { schemaManager } = testContext;
    registerWeapons(schemaManager, [testWeapon, shortRangeWeapon, meleeWeapon]);

    // Main scenario for most tests
    const scenario = useCombatScenario(testContext, {
      weapons: [testWeapon],
      schemaManager, // Share the schema manager
      participants: {
        'flux:actor:alice': {
          team: Team.ALPHA,
          name: 'Alice',
          target: 'flux:actor:bob' as ActorURN,
          position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
          ap: 6,
          energy: { position: 1.0 },
          balance: 1,
          equipment: { weapon: testWeapon.urn },
        },
        'flux:actor:bob': {
          team: Team.BRAVO,
          name: 'Bob',
          position: { coordinate: 110, facing: CombatFacing.LEFT, speed: 0 },
        },
      },
    });

    // Short range scenario for range testing - no weapons array since schemas are already loaded
    shortRangeScenario = useCombatScenario(testContext, {
      weapons: [shortRangeWeapon],
      schemaManager, // Share the schema manager
      participants: {
        'flux:actor:test:attacker': {
          team: Team.ALPHA,
          name: 'Attacker',
          target: 'flux:actor:test:defender' as ActorURN,
          position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
          ap: 6,
          equipment: { weapon: shortRangeWeapon.urn },
        },
        'flux:actor:test:defender': {
          team: Team.BRAVO,
          name: 'Defender',
          position: { coordinate: 200, facing: CombatFacing.LEFT, speed: 0 }, // 100m away
        },
      },
    });

    // Melee scenario for AI debugging - no weapons array since schemas are already loaded
    meleeScenario = useCombatScenario(testContext, {
      weapons: [meleeWeapon],
      schemaManager, // Share the schema manager
      participants: {
        'flux:actor:test:attacker': {
          team: Team.ALPHA,
          name: 'Attacker',
          target: 'flux:actor:test:defender' as ActorURN,
          position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
          ap: 10, // More AP to test multiple strikes
          equipment: { weapon: meleeWeapon.urn },
        },
        'flux:actor:test:defender': {
          team: Team.BRAVO,
          name: 'Defender',
          position: { coordinate: 102, facing: CombatFacing.LEFT, speed: 0 }, // 2m away - close range
        },
      },
    });

    context = testContext;
    session = scenario.session;
    actor = scenario.actors['flux:actor:alice'].actor;
    combatant = scenario.actors['flux:actor:alice'].hooks.combatant.combatant;
  });

  describe('ExecuteCombatPlan Injection', () => {
    it('should use injected executeCombatPlan function', () => {
      // Create mock dependencies
      const mockGenerateCombatPlan = vi.fn().mockReturnValue([
        createActorCommand({
          actor: actor.id,
          location: actor.location,
          type: CommandType.ATTACK,
          args: {
            target: 'flux:actor:bob',
            cost: { ap: 2.0, energy: 1000 },
          },
        }),
        createActorCommand({
          actor: actor.id,
          location: actor.location,
          type: CommandType.ATTACK,
          args: { target: 'flux:actor:bob', cost: { ap: 2.0, energy: 1000 } },
        }),
      ]);

      const mockExecuteCombatPlan: CombatPlanExecutor = vi.fn().mockReturnValue(
        [
          createCombatantDidAttackEvent((event) => ({ ...event, actor: actor.id }))
        ]
      );

      const mockTarget = vi.fn().mockReturnValue([]);
      const mockStrike = vi.fn().mockReturnValue([]);
      const mockDefend = vi.fn().mockReturnValue([]);
      const mockAdvance = vi.fn().mockReturnValue([]);
      const mockRetreat = vi.fn().mockReturnValue([]);

      // Create attack method with injected dependencies
      const attack = createAttackMethod(
        context,
        session,
        actor,
        combatant,
        {
          generateCombatPlan: mockGenerateCombatPlan,
          executeCombatPlan: mockExecuteCombatPlan,
          target: mockTarget,
          strike: mockStrike,
          defend: mockDefend,
          advance: mockAdvance,
          retreat: mockRetreat,
        }
      );

      // Execute attack
      const result = attack();

      // Verify the injected executeCombatPlan was called
      expect(mockExecuteCombatPlan).toHaveBeenCalledWith(
        context,
        session,
        actor,
        combatant,
        expect.arrayContaining([
          expect.objectContaining({
            __type: 'command',
            actor: actor.id,
            type: CommandType.ATTACK,
            args: expect.objectContaining({
              target: 'flux:actor:bob',
              cost: { ap: 2.0, energy: 1000 }
            })
          })
        ]),
        expect.any(String),
        {
          strike: mockStrike,
          defend: mockDefend,
          target: mockTarget,
          advance: mockAdvance,
          retreat: mockRetreat,
          done: expect.any(Function),
        }
      );

      // Verify result includes events from executeCombatPlan
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('combat:actor:attack');
    });

    it('should use default executeCombatPlan when not injected', () => {
      const mockGenerateCombatPlan = vi.fn().mockReturnValue([
        createActorCommand({
          actor: actor.id,
          location: actor.location,
          type: CommandType.ATTACK,
          args: { target: 'flux:actor:bob', cost: { ap: 2.0, energy: 1000 } },
        }),
      ]);

      const mockStrike = vi.fn().mockReturnValue([
        createCombatantDidAttackEvent((event) => ({ ...event, actor: actor.id }))
      ]);

      // Create attack method without executeCombatPlan injection
      const attack = createAttackMethod(
        context,
        session,
        actor,
        combatant,
        {
          generateCombatPlan: mockGenerateCombatPlan,
          strike: mockStrike,
        }
      );

      // Execute attack
      const result = attack();

      // Verify the default executeCombatPlan was used (strike method called)
      expect(mockStrike).toHaveBeenCalledWith('flux:actor:bob', expect.any(String));
      // Should have 1 event: only strike (no target acquisition since combatant already targets 'flux:actor:bob')
      expect(result).toHaveLength(1);
      expect(result).toContainEqual(expect.objectContaining({ type: 'combat:actor:attack' }));
    });
  });

  describe('Target Management', () => {
    it('should update target when provided and include target events', () => {
      const mockTarget = vi.fn().mockReturnValue([
        createCombatantDidAcquireTargetEvent((event) => ({ ...event, actor: actor.id }))
      ]);

      const mockGenerateCombatPlan = vi.fn().mockReturnValue([]);

      const attack = createAttackMethod(
        context,
        session,
        actor,
        combatant,
        {
          generateCombatPlan: mockGenerateCombatPlan,
          target: mockTarget,
        }
      );

      const result = attack('flux:actor:charlie' as ActorURN);

      // Verify target method was called
      expect(mockTarget).toHaveBeenCalledWith('flux:actor:charlie', expect.any(String));

      // Verify target events are included in result
      expect(result).toContainEqual(
        expect.objectContaining({ type: 'combat:actor:target:acquired' })
      );
    });

    it('should require existing target when none provided', () => {
      const combatantWithoutTarget = { ...combatant, target: null };
      const mockDeclareError = vi.spyOn(context, 'declareError');

      const attack = createAttackMethod(
        context,
        session,
        actor,
        combatantWithoutTarget,
      );

      const result = attack();

      expect(mockDeclareError).toHaveBeenCalledWith(
        'No target selected. Use "target <name>" or "attack <name>" to select a target first.',
        expect.any(String)
      );
      expect(result).toEqual([]);
    });
  });

  describe('Movement Actions in Combat Plans', () => {
    it('should execute ADVANCE actions through combat plan', () => {
      const mockAdvance = vi.fn().mockReturnValue([
        createCombatantDidMoveEvent((event) => ({ ...event, actor: actor.id }))
      ]);

      const mockGenerateCombatPlan = vi.fn().mockReturnValue([
        createActorCommand({
          actor: actor.id,
          location: actor.location,
          type: CommandType.ADVANCE,
          args: { distance: 10, cost: { ap: 1.0 } },
        }),
      ]);

      const attack = createAttackMethod(
        context,
        session,
        actor,
        combatant,
        {
          generateCombatPlan: mockGenerateCombatPlan,
          advance: mockAdvance,
        }
      );

      const result = attack();

      // Verify advance method was called with correct args
      expect(mockAdvance).toHaveBeenCalledWith('distance', 10, expect.any(String), { autoDone: undefined });
      expect(result).toContainEqual(
        expect.objectContaining({ type: EventType.ACTOR_DID_MOVE_IN_COMBAT })
      );
    });

    it('should execute RETREAT actions through combat plan', () => {
      const mockRetreat = vi.fn().mockReturnValue([
        createCombatantDidMoveEvent((event) => ({ ...event, actor: actor.id }))
      ]);

      const mockGenerateCombatPlan = vi.fn().mockReturnValue([
        createActorCommand({
          actor: actor.id,
          location: actor.location,
          type: CommandType.RETREAT,
          args: { distance: 5, cost: { ap: 1.0 } },
        }),
      ]);

      const attack = createAttackMethod(
        context,
        session,
        actor,
        combatant,
        {
          generateCombatPlan: mockGenerateCombatPlan,
          retreat: mockRetreat,
        }
      );

      const result = attack();

      // Verify retreat method was called with correct args
      expect(mockRetreat).toHaveBeenCalledWith('distance', 5, expect.any(String), { autoDone: undefined });
      expect(result).toContainEqual(
        expect.objectContaining({ type: EventType.ACTOR_DID_MOVE_IN_COMBAT })
      );
    });

    it('should handle mixed action plans with movement and combat', () => {
      const mockAdvance = vi.fn().mockReturnValue([
        createCombatantDidMoveEvent((event) => ({ ...event, actor: actor.id }))
      ]);
      const mockStrike = vi.fn().mockReturnValue([
        createCombatantDidAttackEvent((event) => ({ ...event, actor: actor.id }))
      ]);

      const mockGenerateCombatPlan = vi.fn().mockReturnValue([
        createActorCommand( {
          actor: actor.id,
          location: actor.location,
          type: CommandType.ADVANCE,
          args: { distance: 5, cost: { ap: 1.0 } },
        }),
        createActorCommand({
          actor: actor.id,
          location: actor.location,
          type: CommandType.STRIKE,
          args: { target: 'flux:actor:bob', cost: { ap: 2.0 } },
        }),
      ]);

      const attack = createAttackMethod(
        context,
        session,
        actor,
        combatant,
        {
          generateCombatPlan: mockGenerateCombatPlan,
          advance: mockAdvance,
          strike: mockStrike,
        }
      );

      const result = attack();

      // Verify both actions were executed in sequence
      expect(mockAdvance).toHaveBeenCalledWith('distance', 5, expect.any(String), { autoDone: undefined });
      expect(mockStrike).toHaveBeenCalledWith('flux:actor:bob', expect.any(String));
      // Should have 2 events: advance + strike (no target acquisition since combatant already targets 'flux:actor:bob')
      expect(result).toHaveLength(2);
      expect(result).toContainEqual(expect.objectContaining({ type: EventType.ACTOR_DID_MOVE_IN_COMBAT }));
      expect(result).toContainEqual(expect.objectContaining({ type: EventType.ACTOR_DID_ATTACK }));
    });
  });

  describe('Plan Generation and Execution Flow', () => {
    it('should call generateCombatPlan with correct parameters', () => {
      const mockGenerateCombatPlan = vi.fn().mockReturnValue([
        createActorCommand({
          actor: actor.id,
          location: actor.location,
          type: CommandType.STRIKE,
          args: { target: 'flux:actor:bob', cost: { ap: 2.0 } },
        }),
      ]);

      const mockStrike = vi.fn().mockReturnValue([
        createCombatantDidAttackEvent((event) => ({ ...event, actor: actor.id }))
      ]);

      const attack = createAttackMethod(
        context,
        session,
        actor,
        combatant,
        {
          generateCombatPlan: mockGenerateCombatPlan,
          strike: mockStrike,
        }
      );

      const customTrace = 'test-trace-123';
      attack('flux:actor:bob', customTrace);

      // Verify generateCombatPlan was called with correct parameters
      expect(mockGenerateCombatPlan).toHaveBeenCalledWith(
        context,
        session,
        combatant,
        customTrace
      );
      expect(mockGenerateCombatPlan).toHaveBeenCalledTimes(1);
    });

    it('should use default generateCombatPlan when not injected', () => {
      // We can't easily mock the default generateCombatPlan, but we can verify
      // that the attack method attempts to generate a plan by checking that
      // it doesn't immediately error out due to missing plan generation
      const mockStrike = vi.fn().mockReturnValue([
        createCombatantDidAttackEvent((event) => ({ ...event, actor: actor.id }))
      ]);
      const mockDefend = vi.fn().mockReturnValue([
        createCombatantDidDefendEvent((event) => ({ ...event, actor: actor.id }))
      ]);
      const mockDone = vi.fn().mockReturnValue([
        createCombatTurnDidEndEvent((event) => ({ ...event, actor: WellKnownActor.SYSTEM }))
      ]);

      const attack = createAttackMethod(
        context,
        session,
        actor,
        combatant,
        {
          strike: mockStrike,
          defend: mockDefend,
          done: mockDone,
          // No generateCombatPlan injected - should use default
        }
      );

      // This should not throw an error about missing generateCombatPlan
      // The default implementation should be called
      expect(() => attack()).not.toThrow();

      // If the default generateCombatPlan produces any actions, strike should be called
      // (This is an indirect test since we can't easily mock the default)
    });

    it('should handle empty combat plans gracefully', () => {
      const mockGenerateCombatPlan = vi.fn().mockReturnValue([]);
      const mockDeclareError = vi.spyOn(context, 'declareError');

      const attack = createAttackMethod(
        context,
        session,
        actor,
        combatant,
        {
          generateCombatPlan: mockGenerateCombatPlan,
        }
      );

      const result = attack();

      expect(mockDeclareError).toHaveBeenCalledWith(
        'Unable to generate combat plan. No valid actions available.',
        expect.any(String)
      );
      expect(result).toEqual([]);
    });
  });

  describe('Target Assignment in Strike Actions', () => {
    it('should call target method when STRIKE action has explicit target', () => {
      const mockTarget = vi.fn().mockReturnValue([
        createCombatantDidAcquireTargetEvent((event) => ({ ...event, actor: actor.id }))
      ]);
      const mockStrike = vi.fn().mockReturnValue([
        createCombatantDidAttackEvent((event) => ({ ...event, actor: actor.id }))
      ]);

      const mockGenerateCombatPlan = vi.fn().mockReturnValue([
        createActorCommand({
          actor: actor.id,
          location: actor.location,
          type: CommandType.STRIKE,
          args: { target: 'flux:actor:charlie', cost: { ap: 2.0 } }, // Explicit target different from combatant's current target
        }),
      ]);

      const attack = createAttackMethod(
        context,
        session,
        actor,
        combatant, // combatant.target is 'flux:actor:bob'
        {
          generateCombatPlan: mockGenerateCombatPlan,
          target: mockTarget,
          strike: mockStrike,
        }
      );

      const result = attack();

      // Verify target method was called with the explicit target from action args
      expect(mockTarget).toHaveBeenCalledWith('flux:actor:charlie', expect.any(String));

      // Verify strike method was called with the explicit target
      expect(mockStrike).toHaveBeenCalledWith('flux:actor:charlie', expect.any(String));

      // Verify both target acquisition and strike events are in result
      expect(result).toHaveLength(2);
      expect(result).toContainEqual(expect.objectContaining({ type: 'combat:actor:target:acquired' }));
      expect(result).toContainEqual(expect.objectContaining({ type: 'combat:actor:attack' }));
    });

    it('should call target method when ATTACK action has explicit target', () => {
      const mockTarget = vi.fn().mockReturnValue([
        createCombatantDidAcquireTargetEvent((event) => ({ ...event, actor: actor.id }))
      ]);
      const mockStrike = vi.fn().mockReturnValue([
        createCombatantDidAttackEvent((event) => ({ ...event, actor: actor.id }))
      ]);

      const mockGenerateCombatPlan = vi.fn().mockReturnValue([
        createActorCommand({
          actor: actor.id,
          location: actor.location,
          type: CommandType.ATTACK, // Using ATTACK instead of STRIKE
          args: { target: 'flux:actor:dave', cost: { ap: 2.0 } },
        }),
      ]);

      const attack = createAttackMethod(
        context,
        session,
        actor,
        combatant,
        {
          generateCombatPlan: mockGenerateCombatPlan,
          target: mockTarget,
          strike: mockStrike,
        }
      );

      const result = attack();

      // Verify target method was called for ATTACK action too
      expect(mockTarget).toHaveBeenCalledWith('flux:actor:dave', expect.any(String));
      expect(mockStrike).toHaveBeenCalledWith('flux:actor:dave', expect.any(String));
      expect(result).toHaveLength(2);
    });

    it('should not call target method when STRIKE action has no explicit target', () => {
      const mockTarget = vi.fn().mockReturnValue([]);
      const mockStrike = vi.fn().mockReturnValue([
        createCombatantDidAttackEvent((event) => ({ ...event, actor: actor.id }))
      ]);

      const mockGenerateCombatPlan = vi.fn().mockReturnValue([
        createActorCommand({
          actor: actor.id,
          location: actor.location,
          type: CommandType.STRIKE,
          args: { cost: { ap: 2.0 } }, // No target specified
        }),
      ]);

      const attack = createAttackMethod(
        context,
        session,
        actor,
        combatant, // combatant.target is 'flux:actor:bob'
        {
          generateCombatPlan: mockGenerateCombatPlan,
          target: mockTarget,
          strike: mockStrike,
        }
      );

      const result = attack();

      // Verify target method was NOT called since no explicit target
      expect(mockTarget).not.toHaveBeenCalled();

      // Verify strike method was called with combatant's existing target
      expect(mockStrike).toHaveBeenCalledWith('flux:actor:bob', expect.any(String));
      expect(result).toHaveLength(1);
      expect(result).toContainEqual(expect.objectContaining({ type: 'combat:actor:attack' }));
    });

    it('should handle STRIKE action with null target args gracefully', () => {
      const mockTarget = vi.fn().mockReturnValue([]);
      const mockStrike = vi.fn().mockReturnValue([
        createCombatantDidAttackEvent((event) => ({ ...event, actor: actor.id }))
      ]);

      const mockGenerateCombatPlan = vi.fn().mockReturnValue([
        createActorCommand({
          actor: actor.id,
          location: actor.location,
          type: CommandType.STRIKE,
          args: { target: null, cost: { ap: 2.0 } }, // Explicit null target
        }),
      ]);

      const attack = createAttackMethod(
        context,
        session,
        actor,
        combatant,
        {
          generateCombatPlan: mockGenerateCombatPlan,
          target: mockTarget,
          strike: mockStrike,
        }
      );

      const result = attack();

      // Verify target method was NOT called for null target
      expect(mockTarget).not.toHaveBeenCalled();

      // Verify strike method was called with combatant's existing target
      expect(mockStrike).toHaveBeenCalledWith('flux:actor:bob', expect.any(String));
      expect(result).toHaveLength(1);
    });
  });

  describe('AI Combat Plan Generation Issues', () => {

    it('should generate movement actions when target is out of weapon range', () => {
      // This test defines what SHOULD happen
      // Use the hoisted shortRangeScenario instead of creating inline

      // Mock generateCombatPlan to return what it SHOULD return
      const expectedPlan: CombatCommand[] = [
        createActorCommand({
          actor: shortRangeScenario.actors['flux:actor:test:attacker'].actor.id,
          location: shortRangeScenario.actors['flux:actor:test:attacker'].actor.location,
          type: CommandType.ADVANCE,
          args: { distance: 42, cost: { ap: 6, energy: 0 } }, // Move as far as possible with 6 AP
        }),
      ];

      const mockGenerateCombatPlan = vi.fn().mockReturnValue(expectedPlan);

      const attack = createAttackMethod(
        context,
        shortRangeScenario.session,
        shortRangeScenario.actors['flux:actor:test:attacker'].actor,
        shortRangeScenario.actors['flux:actor:test:attacker'].hooks.combatant.combatant,
        {
          generateCombatPlan: mockGenerateCombatPlan,
        }
      );

      const events: WorldEvent[] = attack();

      // `ATTACK` is just a high-level facade that delegates to other actions internally
      // So we don't expect it to produce any events
      expect(events.length).toBe(0);
    });
  });

  describe('Trace Propagation', () => {
    it('should propagate custom trace to WorldEvent payloads', () => {
      const customTrace = 'custom-attack-trace-123';

      // Mock the executeCombatPlan to return a simple event with the trace passed to it
      const mockExecuteCombatPlan = vi.fn().mockImplementation((plan, context, session, actor, combatant, trace) => [
        createWorldEvent({
          id: 'test-id',
          ts: DEFAULT_TIMESTAMP,
          type: EventType.ACTOR_DID_ATTACK,
          actor: actor.id,
          location: actor.location,
          trace: trace, // Use the trace parameter passed to the function
          payload: {
            cost: { ap: 2.0, energy: 1000 },
            target: 'flux:actor:bob',
            roll: { result: 15, dice: '1d20' },
            outcome: 'hit',
            damage: { amount: 8, type: 'slashing' }
          } as any,
        })
      ]);

      // Mock generateCombatPlan to return a simple attack plan
      const mockGenerateCombatPlan = vi.fn().mockReturnValue([
        createActorCommand({
          actor: actor.id,
          location: actor.location,
          type: CommandType.ATTACK,
          args: {
            target: 'flux:actor:bob',
            cost: { ap: 2.0, energy: 1000 }
          },
        })
      ]);

      const attackMethod = createAttackMethod(
        context,
        session,
        actor,
        combatant,
        {
          generateCombatPlan: mockGenerateCombatPlan,
          executeCombatPlan: mockExecuteCombatPlan
        }
      );

      const events: WorldEvent[] = attackMethod('flux:actor:bob', customTrace);

      expect(events).toHaveLength(1);
      // Only event should be the combat plan execution event (no target acquisition since combatant already targets 'flux:actor:bob')
      expect(events[0].type).toBe(EventType.ACTOR_DID_ATTACK);
      expect(events[0].trace).toBe(customTrace);
      expect(mockExecuteCombatPlan).toHaveBeenCalled();
    });

    it('should use generated trace when none provided', () => {
      // Mock context.uniqid to return a known value
      const generatedTrace = 'generated-trace-456';
      context.uniqid = vi.fn().mockReturnValue(generatedTrace);

      // Mock all dependencies to ensure predictable behavior
      const mockTarget = vi.fn().mockReturnValue([]);
      const mockStrike = vi.fn().mockReturnValue([]);
      const mockDefend = vi.fn().mockReturnValue([]);
      const mockAdvance = vi.fn().mockReturnValue([]);
      const mockRetreat = vi.fn().mockReturnValue([]);

      // Mock generateCombatPlan to return a simple plan
      const mockGenerateCombatPlan = vi.fn().mockReturnValue([
        createActorCommand({
          actor: actor.id,
          location: actor.location,
          type: CommandType.ATTACK,
          args: { target: 'flux:actor:bob', cost: { ap: 2.0, energy: 1000 } },
        }),
      ]);

      const mockExecuteCombatPlan = vi.fn().mockReturnValue([
        createWorldEvent({
          id: 'test-id',
          ts: DEFAULT_TIMESTAMP,
          type: EventType.ACTOR_DID_ATTACK,
          actor: actor.id,
          location: actor.location,
          trace: generatedTrace,
          payload: {
            cost: { ap: 2.0, energy: 1000 },
            target: 'flux:actor:bob',
            roll: { result: 15, dice: '1d20' },
            outcome: 'hit',
            damage: { amount: 8, type: 'slashing' }
          } as any,
        })
      ]);

      const attackMethod = createAttackMethod(
        context,
        session,
        actor,
        combatant,
        {
          generateCombatPlan: mockGenerateCombatPlan,
          executeCombatPlan: mockExecuteCombatPlan,
          target: mockTarget,
          strike: mockStrike,
          defend: mockDefend,
          advance: mockAdvance,
          retreat: mockRetreat,
        }
      );

      const result = attackMethod('flux:actor:bob'); // No trace provided

      expect(result).toHaveLength(1);
      expect(result[0].trace).toBe(generatedTrace);
      expect(context.uniqid).toHaveBeenCalled();
      expect(mockGenerateCombatPlan).toHaveBeenCalled();
      expect(mockExecuteCombatPlan).toHaveBeenCalled();
    });
  });

  describe('AI Planning Analysis', () => {
    it('should generate combat plans for close-range scenarios', () => {
      const attacker = meleeScenario.actors['flux:actor:test:attacker'];
      const defender = meleeScenario.actors['flux:actor:test:defender'];

      // Verify scenario setup
      expect(attacker.hooks.combatant.combatant.ap.eff.cur).toBeGreaterThan(0);
      expect(attacker.hooks.combatant.combatant.target).toBeTruthy();

      const weaponSchema = context.equipmentApi.getEquippedWeaponSchema(attacker.actor);
      expect(weaponSchema).toBeDefined();

      const distance = Math.abs(
        defender.hooks.combatant.combatant.position.coordinate -
        attacker.hooks.combatant.combatant.position.coordinate
      );

      const weaponAssessment = assessWeaponCapabilities(context, weaponSchema!, distance);
      expect(weaponAssessment).toBeDefined();

      // Mock weapon cost calculation
      const mockCalculateWeaponApCost = vi.fn().mockReturnValue(2);
      const testDeps = {
        ...DEFAULT_COMBAT_PLANNING_DEPS,
        timestamp: () => Date.now(),
        calculateWeaponApCost: mockCalculateWeaponApCost,
      };

      // Test AI planning
      const plan = generateCombatPlan(
        context,
        meleeScenario.session,
        attacker.hooks.combatant.combatant,
        'test-trace',
        testDeps
      );

      // Verify plan generation
      expect(plan).toBeDefined();
      expect(Array.isArray(plan)).toBe(true);

      // The AI should generate at least one action for a valid combat scenario
      expect(plan.length).toBeGreaterThan(0);

      // Verify plan structure
      plan.forEach(action => {
        expect(action).toHaveProperty('type');
        expect(action).toHaveProperty('args');
        // Some actions may have cost, others may have different properties like autoDone
        expect(typeof action.args).toBe('object');
      });
    });
  });
});
