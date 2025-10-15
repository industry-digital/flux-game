import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTargetMethod } from './target';
import { useCombatScenario } from '../testing/scenario';
import { createTransformerContext } from '~/worldkit/context';
import { createSwordSchema } from '~/worldkit/schema/weapon/sword';
import { registerWeapons } from '../testing/schema';
import { ActorURN } from '~/types/taxonomy';
import { EventType } from '~/types/event';
import { Team } from '~/types/combat';

describe('Target Method', () => {
  let scenario: ReturnType<typeof useCombatScenario>;
  let context: ReturnType<typeof createTransformerContext>;
  let target: ReturnType<typeof createTargetMethod>;

  // Define target IDs that will be used across tests
  const TARGETER_ID: ActorURN = 'flux:actor:test:targeter';
  const ENEMY_ID: ActorURN = 'flux:actor:enemy';
  const ENEMY1_ID: ActorURN = 'flux:actor:enemy1';
  const ENEMY2_ID: ActorURN = 'flux:actor:enemy2';

  beforeEach(() => {
    context = createTransformerContext();
    context.declareEvent = vi.fn();

    const swordSchema = createSwordSchema({
      urn: 'flux:schema:weapon:test',
      name: 'Test Weapon',
    });

    // Register weapons with the schema manager
    const { schemaManager } = context;
    registerWeapons(schemaManager, [swordSchema]);

    scenario = useCombatScenario(context, {
      weapons: [swordSchema],
      schemaManager,
      participants: {
        [TARGETER_ID]: {
          team: Team.ALPHA,
          stats: { pow: 10, fin: 10, res: 10 },
          skills: { 'flux:skill:evasion': { xp: 0, pxp: 0, rank: 1 } },
          equipment: { weapon: swordSchema.urn },
          position: { coordinate: 100, facing: 1, speed: 0 },
          // Note: No initial target - starts as null for testing
        },
        // Create potential targets that can be used in tests
        [ENEMY_ID]: {
          team: Team.BRAVO,
          position: { coordinate: 110, facing: -1, speed: 0 },
        },
        [ENEMY1_ID]: {
          team: Team.BRAVO,
          position: { coordinate: 120, facing: -1, speed: 0 },
        },
        [ENEMY2_ID]: {
          team: Team.BRAVO,
          position: { coordinate: 130, facing: -1, speed: 0 },
        },
      },
    });

    const targeter = scenario.actors[TARGETER_ID];
    const targeterCombatant = scenario.session.data.combatants.get(TARGETER_ID)!;

    target = createTargetMethod(
      context,
      scenario.session,
      targeter.actor,
      targeterCombatant,
    );
  });

  describe('Basic Functionality', () => {
    it('should set target on combatant', () => {
      const targeterCombatant = scenario.session.data.combatants.get(TARGETER_ID)!;

      const result = target(ENEMY_ID);

      expect(targeterCombatant.target).toBe(ENEMY_ID);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(EventType.COMBATANT_DID_ACQUIRE_TARGET);
    });

    it('should call declareEvent on context', () => {
      target(ENEMY_ID);

      expect(context.declareEvent).toHaveBeenCalledTimes(1);
      expect(context.declareEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.COMBATANT_DID_ACQUIRE_TARGET
        })
      );
    });
  });

  describe('Event Shape', () => {
    it('should create properly structured COMBATANT_DID_ACQUIRE_TARGET event', () => {
      const targeter = scenario.actors[TARGETER_ID].actor;
      const customTrace = 'test-trace-123';

      const result = target(ENEMY_ID, customTrace);

      expect(result).toHaveLength(1);
      const event = result[0];

      // Validate complete event structure
      expect(event).toMatchObject({
        type: EventType.COMBATANT_DID_ACQUIRE_TARGET,
        actor: targeter.id,
        location: targeter.location,
        trace: customTrace,
        payload: {
          sessionId: scenario.session.id,
          target: ENEMY_ID
        }
      });

      // Validate that event has required properties
      expect(event).toHaveProperty('id');
      expect(event).toHaveProperty('ts');
      expect(typeof event.id).toBe('string');
      expect(typeof event.ts).toBe('number');
    });
  });

  describe('Trace Propagation', () => {
    it('should propagate custom trace to WorldEvent payloads', () => {
      const customTrace = 'custom-target-trace-123';

      const result = target(ENEMY_ID, customTrace);

      expect(result).toHaveLength(1);
      expect(result[0].trace).toBe(customTrace);
      expect(result[0].type).toBe(EventType.COMBATANT_DID_ACQUIRE_TARGET);
    });

    it('should use generated trace when none provided', () => {
      // Mock context.uniqid to return a known value
      const generatedTrace = 'generated-target-trace-456';
      context.uniqid = vi.fn().mockReturnValue(generatedTrace);

      const result = target(ENEMY_ID); // No trace provided

      expect(result).toHaveLength(1);
      expect(result[0].trace).toBe(generatedTrace);
      expect(context.uniqid).toHaveBeenCalled();
      expect(result[0].type).toBe(EventType.COMBATANT_DID_ACQUIRE_TARGET);
    });
  });

  describe('Idempotent Behavior', () => {
    it('should not generate event when targeting same actor twice', () => {
      const targeterCombatant = scenario.session.data.combatants.get(TARGETER_ID)!;

      // First target call - should generate event
      const firstResult = target(ENEMY_ID);
      expect(firstResult).toHaveLength(1);
      expect(firstResult[0].type).toBe(EventType.COMBATANT_DID_ACQUIRE_TARGET);
      expect(targeterCombatant.target).toBe(ENEMY_ID);

      // Reset mock to count only subsequent calls
      vi.clearAllMocks();

      // Second target call with same target - should not generate event
      const secondResult = target(ENEMY_ID);
      expect(secondResult).toHaveLength(0);
      expect(targeterCombatant.target).toBe(ENEMY_ID); // Target unchanged
      expect(context.declareEvent).not.toHaveBeenCalled();
    });

    it('should generate event when changing to different target', () => {
      const targeterCombatant = scenario.session.data.combatants.get(TARGETER_ID)!;

      // First target call
      const firstResult = target(ENEMY1_ID);
      expect(firstResult).toHaveLength(1);
      expect(targeterCombatant.target).toBe(ENEMY1_ID);

      // Reset mock to count only subsequent calls
      vi.clearAllMocks();

      // Second target call with different target - should generate event
      const secondResult = target(ENEMY2_ID);
      expect(secondResult).toHaveLength(1);
      expect(secondResult[0].type).toBe(EventType.COMBATANT_DID_ACQUIRE_TARGET);
      expect((secondResult[0].payload as any).target).toBe(ENEMY2_ID);
      expect(targeterCombatant.target).toBe(ENEMY2_ID);
      expect(context.declareEvent).toHaveBeenCalledTimes(1);
      expect(context.declareEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.COMBATANT_DID_ACQUIRE_TARGET
        })
      );
    });

    it('should handle multiple consecutive calls with same target', () => {
      const targeterCombatant = scenario.session.data.combatants.get(TARGETER_ID)!;

      // First call - should generate event
      const firstResult = target(ENEMY_ID);
      expect(firstResult).toHaveLength(1);

      // Reset mock to count only subsequent calls
      vi.clearAllMocks();

      // Multiple subsequent calls with same target - none should generate events
      for (let i = 0; i < 5; i++) {
        const result = target(ENEMY_ID);
        expect(result).toHaveLength(0);
        expect(targeterCombatant.target).toBe(ENEMY_ID);
      }

      expect(context.declareEvent).not.toHaveBeenCalled();
    });

    it('should work correctly when target is initially null', () => {
      const targeterCombatant = scenario.session.data.combatants.get(TARGETER_ID)!;

      // Ensure target starts as null (no initial target set in beforeEach)
      expect(targeterCombatant.target).toBeNull();

      // First call should generate event
      const result = target(ENEMY_ID);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(EventType.COMBATANT_DID_ACQUIRE_TARGET);
      expect(targeterCombatant.target).toBe(ENEMY_ID);
      expect(context.declareEvent).toHaveBeenCalledTimes(1);
      expect(context.declareEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.COMBATANT_DID_ACQUIRE_TARGET
        })
      );
    });
  });
});
