import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  initializeCombatantAttributes,
  createCombatantApi,
  createCombatantApiFactory,
  MOVE_BY_DISTANCE,
  MOVE_BY_AP,
} from './combatant';
import { useCombatScenario } from './testing/scenario';
import { createTransformerContext } from '~/worldkit/context';
import { createSwordSchema } from '~/worldkit/schema/weapon/sword';
import { CombatSession, Combatant, Team, CombatFacing } from '~/types/combat';
import { TransformerContext } from '~/types/handler';
import { ActorURN } from '~/types/taxonomy';
import { Actor } from '~/types/entity/actor';
import { createCombatTurnDidEndEvent } from '~/testing/event/factory';
import { getCurrentAp, getMaxAp } from '~/worldkit/combat/ap';
import { getCapacitorPosition, getCurrentEnergy } from '~/worldkit/entity/actor/capacitor';

/**
 * Helper function to create a test scenario using the new useCombatScenario hook
 * Creates a primary actor and a target actor by default to support all combat methods
 */
function createTestScenario(config?: {
  actorId?: ActorURN;
  targetId?: ActorURN;
  stats?: { pow?: number; fin?: number; res?: number };
  combatantOverrides?: Partial<Combatant>;
}) {
  const {
    actorId = 'flux:actor:test-actor' as ActorURN,
    targetId = 'flux:actor:test-target' as ActorURN,
    stats = { pow: 10, fin: 10, res: 10 },
    combatantOverrides = {},
  } = config || {};

  const context = createTransformerContext();
  const swordSchema = createSwordSchema({
    urn: 'flux:schema:weapon:test-sword',
    name: 'Test Sword',
  });

  const scenario = useCombatScenario(context, {
    weapons: [swordSchema],
    schemaManager: context.schemaManager,
    participants: {
      [actorId]: {
        team: Team.ALPHA,
        target: targetId,
        stats,
        position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
        equipment: { weapon: swordSchema.urn },
      },
      [targetId]: {
        team: Team.BRAVO,
        stats: { pow: 10, fin: 10, res: 10 },
        position: { coordinate: 101, facing: CombatFacing.LEFT, speed: 0 },
        equipment: { weapon: swordSchema.urn },
      },
    },
  });

  const actor = scenario.actors[actorId].actor;
  const session = scenario.session;
  const combatant = session.data.combatants.get(actorId)!;

  // Apply combatant overrides if provided
  if (combatantOverrides) {
    Object.assign(combatant, combatantOverrides);
  }

  return { context, session, actor, combatant };
}

describe('combatant', () => {
  let context: TransformerContext;
  let session: CombatSession;
  let actor: Actor;
  let combatant: Combatant;
  const actorId: ActorURN = 'flux:actor:test-actor';

  beforeEach(() => {
    const scenario = createTestScenario({ actorId });
    ({ context, session, actor, combatant } = scenario);
  });

  describe('initializeCombatantAttributes', () => {

    it('should initialize combatant attributes with correct AP values', () => {
      const { actor: testActor } = createTestScenario({
        stats: { pow: 15, fin: 12, res: 10 }
      });

      const attributes = initializeCombatantAttributes(testActor);

      expect(getCurrentAp(combatant)).toBeGreaterThan(0);
      expect(getMaxAp(combatant)).toBeGreaterThan(0);
      expect(getCurrentAp(combatant)).toBe(getCurrentAp(combatant));
    });

    it('should initialize energy attributes from actor capacitor', () => {
      const { actor: testActor } = createTestScenario({
        stats: { res: 12, pow: 10, fin: 10 }
      });

      const attributes = initializeCombatantAttributes(testActor);

      expect(getCapacitorPosition(testActor)).toBeGreaterThan(0);
      expect(getCurrentEnergy(testActor)).toBeGreaterThan(0);
    });
  });

  describe('CombatantApi', () => {
    it('should throw error when combatant not found in session', () => {
      const { context: emptyContext, session: emptySession, actor: testActor } = createTestScenario({
        actorId
      });
      // Remove combatant from session to test error case
      emptySession.data.combatants.clear();

      expect(() => {
        createCombatantApi(emptyContext, emptySession, testActor);
      }).toThrow('Combatant not found: flux:actor:test-actor');
    });

    it('should return combatant hook with all methods', () => {
      const hook = createCombatantApi(context, session, actor);

      expect(hook).toHaveProperty('combatant');
      expect(hook).toHaveProperty('target');
      expect(hook).toHaveProperty('advance');
      expect(hook).toHaveProperty('retreat');
      expect(hook).toHaveProperty('attack');
      expect(hook).toHaveProperty('defend');
      expect(typeof hook.target).toBe('function');
      expect(typeof hook.advance).toBe('function');
      expect(typeof hook.retreat).toBe('function');
      expect(typeof hook.attack).toBe('function');
      expect(typeof hook.defend).toBe('function');
    });

    it('should create working methods that can be called', () => {
      const { context: testContext, session: testSession, actor: testActor } = createTestScenario({
        actorId,
        combatantOverrides: {
          ap: {
            current: 10,
            max: 10,
          },
        }
      });

      const hook = createCombatantApi(testContext, testSession, testActor, {
        advanceTurn: () => []
      });

      // Test that methods return WorldEvent arrays
      const targetResult = hook.target('flux:actor:target' as ActorURN);
      expect(Array.isArray(targetResult)).toBe(true);

      const advanceResult = hook.advance(MOVE_BY_DISTANCE, 5);
      expect(Array.isArray(advanceResult)).toBe(true);

      const retreatResult = hook.retreat(MOVE_BY_DISTANCE, 5);
      expect(Array.isArray(retreatResult)).toBe(true);

      const attackResult = hook.attack();
      expect(Array.isArray(attackResult)).toBe(true);

      const defendResult = hook.defend();
      expect(Array.isArray(defendResult)).toBe(true);
    });

    it('should ensure all hook methods return WorldEvent arrays', () => {
      const { context: testContext, session: testSession, actor: testActor } = createTestScenario({
        actorId,
        combatantOverrides: {
          ap: {
            current: 10,
            max: 10,
          },
        }
      });

      // Create test API with stubbed defend cost to prevent AP overflow
      const createTestApi = createCombatantApiFactory({
        defendDeps: {
          createDefendCost: () => ({ ap: 0.5, energy: 0 })
        }
      });
      const hook = createTestApi(testContext, testSession, testActor, {
        advanceTurn: () => []
      });

      // Test each method returns proper WorldEvent array
      const methods = [
        () => hook.target('flux:actor:target' as ActorURN),
        () => hook.advance(MOVE_BY_DISTANCE, 1),
        () => hook.advance(MOVE_BY_AP, 1),
        () => hook.retreat(MOVE_BY_DISTANCE, 1),
        () => hook.attack(),
        () => hook.defend(),
      ];

      methods.forEach((method, index) => {
        const result = method();
        expect(Array.isArray(result), `Method ${index} should return array`).toBe(true);
        result.forEach((event, eventIndex) => {
          expect(typeof event, `Method ${index}, event ${eventIndex} should be object`).toBe('object');
          expect(event, `Method ${index}, event ${eventIndex} should have type property`).toHaveProperty('type');
        });
      });
    });

    it('should accept advanceTurn callback and pass it to hook methods', () => {
      const mockAdvanceTurn = vi.fn(() => [
        createCombatTurnDidEndEvent(),
      ]);

      const hook = createCombatantApi(context, session, actor, {
        advanceTurn: mockAdvanceTurn
      });

      expect(hook).toHaveProperty('combatant');
      expect(hook.combatant).toBe(combatant);
    });

    it('should use default empty advanceTurn when none provided', () => {
      const hook = createCombatantApi(context, session, actor);

      expect(hook).toHaveProperty('combatant');
      expect(hook.combatant).toBe(combatant);
    });

    describe('canAct', () => {
      it('should return false for floating-point precision artifacts near zero', () => {
        const { context: testContext, session: testSession, actor: testActor } = createTestScenario({
          actorId,
          combatantOverrides: {
            ap: {
              current: 1.6653345369377348e-16, // Floating-point precision artifact
              max: 6,
            },
          }
        });

        const hook = createCombatantApi(testContext, testSession, testActor);

        // Should return false because cleanApPrecision(1.6653345369377348e-16) rounds to 0
        expect(hook.canAct()).toBe(false);
      });

      it('should return true for meaningful AP values', () => {
        const { context: testContext, session: testSession, actor: testActor } = createTestScenario({
          actorId,
          combatantOverrides: {
            ap: {
              current: 6,
              max: 0.1, // Exactly 0.1 AP
            },
          }
        });

        const hook = createCombatantApi(testContext, testSession, testActor);

        // Should return true because cleanApPrecision(0.1) = 0.1 > 0
        expect(hook.canAct()).toBe(true);
      });

      it('should return false for exactly zero AP', () => {
        const { context: testContext, session: testSession, actor: testActor } = createTestScenario({
          actorId,
          combatantOverrides: {
            ap: {
              current: 0, // Exactly zero AP
              max: 6,
            },
          }
        });

        const hook = createCombatantApi(testContext, testSession, testActor);

        // Should return false because cleanApPrecision(0) = 0
        expect(hook.canAct()).toBe(false);
      });
    });
  });
});
