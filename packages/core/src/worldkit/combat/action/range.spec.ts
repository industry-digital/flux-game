import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRangeMethod } from './range';
import { CombatantDidAcquireRange, EventType } from '~/types/event';
import { CombatFacing, MovementDirection } from '~/types/combat';
import { useCombatMovementTestScenario } from '../testing/movement';
import { extractFirstEventOfType } from '~/testing/event/parsing';

describe('createRangeMethod', () => {
  let defaultScenario: ReturnType<typeof useCombatMovementTestScenario>;
  let mockComputeDistance: ReturnType<typeof vi.fn>;
  let range: ReturnType<typeof createRangeMethod>;

  beforeEach(() => {
    vi.clearAllMocks();
    defaultScenario = useCombatMovementTestScenario();
    // Create mock for distance calculation
    mockComputeDistance = vi.fn().mockReturnValue(50);

    // Create range method with default scenario and dependencies
    const { context, scenario, attackerActor, attacker } = defaultScenario;
    range = createRangeMethod(context, scenario.session, attackerActor, attacker, {
      computeDistanceBetweenCombatants: mockComputeDistance,
    });
  });

  // Helper function to create a range method with custom scenario
  const createCustomRangeMethod = (customScenario: ReturnType<typeof useCombatMovementTestScenario>) => {
    const { context, scenario, attackerActor, attacker } = customScenario;
    return createRangeMethod(context, scenario.session, attackerActor, attacker, {
      computeDistanceBetweenCombatants: mockComputeDistance,
    });
  };

  // Helper function to extract range event from results
  const extractRangeEvent = (result: any[]) =>
    extractFirstEventOfType<CombatantDidAcquireRange>(result, EventType.COMBATANT_DID_ACQUIRE_RANGE)!;

  describe('basic range calculation', () => {
    it('should calculate and return range to target', () => {
      const { attacker } = defaultScenario;
      const result = range(defaultScenario.ENEMY_ID);

      expect(result).toHaveLength(1);
      expect(mockComputeDistance).toHaveBeenCalledWith(attacker, expect.any(Object));

      const event = extractRangeEvent(result);
      expect(event.type).toBe(EventType.COMBATANT_DID_ACQUIRE_RANGE);
      expect(event.payload.range).toBe(50);
      expect(event.payload.target).toBe(defaultScenario.ENEMY_ID);
    });

    it('should work with different distances', () => {
      // Test various distances
      const testDistances = [1, 25, 100, 150];

      testDistances.forEach(distance => {
        mockComputeDistance.mockReturnValue(distance);

        const result = range(defaultScenario.ENEMY_ID);
        const event = extractRangeEvent(result);

        expect(event.payload.range).toBe(distance);
      });
    });
  });

  describe('direction calculation', () => {
    it('should calculate FORWARD when target is in facing direction (RIGHT)', () => {
      const scenario = useCombatMovementTestScenario({
        attackerPosition: 100,
        enemyPosition: 150, // Enemy to the right
      });
      const { attacker } = scenario;
      attacker.position.facing = CombatFacing.RIGHT;

      const customRange = createCustomRangeMethod(scenario);
      const result = customRange(scenario.ENEMY_ID);

      const event = extractRangeEvent(result);
      expect(event.payload.direction).toBe(MovementDirection.FORWARD);
    });

    it('should calculate BACKWARD when target is opposite to facing direction (RIGHT)', () => {
      const scenario = useCombatMovementTestScenario({
        attackerPosition: 150,
        enemyPosition: 100, // Enemy to the left
      });
      const { attacker } = scenario;
      attacker.position.facing = CombatFacing.RIGHT;

      const customRange = createCustomRangeMethod(scenario);
      const result = customRange(scenario.ENEMY_ID);

      const event = extractRangeEvent(result);
      expect(event.payload.direction).toBe(MovementDirection.BACKWARD);
    });

    it('should calculate FORWARD when target is in facing direction (LEFT)', () => {
      const scenario = useCombatMovementTestScenario({
        attackerPosition: 150,
        enemyPosition: 100, // Enemy to the left
      });
      const { attacker } = scenario;
      attacker.position.facing = CombatFacing.LEFT;

      const customRange = createCustomRangeMethod(scenario);
      const result = customRange(scenario.ENEMY_ID);

      const event = extractRangeEvent(result);
      expect(event.payload.direction).toBe(MovementDirection.FORWARD);
    });

    it('should calculate BACKWARD when target is opposite to facing direction (LEFT)', () => {
      const scenario = useCombatMovementTestScenario({
        attackerPosition: 100,
        enemyPosition: 150, // Enemy to the right
      });
      const { attacker } = scenario;
      attacker.position.facing = CombatFacing.LEFT;

      const customRange = createCustomRangeMethod(scenario);
      const result = customRange(scenario.ENEMY_ID);

      const event = extractRangeEvent(result);
      expect(event.payload.direction).toBe(MovementDirection.BACKWARD);
    });

    it('should handle same position (zero distance) correctly', () => {
      const scenario = useCombatMovementTestScenario({
        attackerPosition: 100,
        enemyPosition: 100, // Same position
      });
      mockComputeDistance.mockReturnValue(0);

      const customRange = createCustomRangeMethod(scenario);
      const result = customRange(scenario.ENEMY_ID);

      const event = extractRangeEvent(result);
      expect(event.payload.range).toBe(0);
      // When distance is 0, direction should be FORWARD (>= 0 condition)
      expect(event.payload.direction).toBe(MovementDirection.FORWARD);
    });
  });

  describe('error handling', () => {
    it('should error when target not found in combat session', () => {
      const { context } = defaultScenario;
      const result = range('flux:actor:nonexistent-target' as any);

      expect(result).toHaveLength(0);
      expect(context.declareError).toHaveBeenCalledWith(
        'Target "flux:actor:nonexistent-target" not found in combat.',
        expect.any(String)
      );
    });

    it('should error when target actor not found in world', () => {
      const { context, scenario, attacker } = defaultScenario;

      // Add a combatant that doesn't exist in the world
      const phantomTargetId = 'flux:actor:phantom-target' as any;
      scenario.session.data.combatants.set(phantomTargetId, {
        ...attacker,
        actorId: phantomTargetId,
      });

      const result = range(phantomTargetId);

      expect(result).toHaveLength(0);
      expect(context.declareError).toHaveBeenCalledWith(
        `Target actor "${phantomTargetId}" not found.`,
        expect.any(String)
      );
    });

    it('should validate both combatant and actor existence', () => {
      const { context } = defaultScenario;
      const result = range('flux:actor:completely-missing' as any);

      expect(result).toHaveLength(0);
      expect(context.declareError).toHaveBeenCalledWith(
        'Target "flux:actor:completely-missing" not found in combat.',
        expect.any(String)
      );
    });
  });

  describe('event generation', () => {
    it('should generate COMBATANT_DID_ACQUIRE_RANGE event', () => {
      const { attackerActor } = defaultScenario;
      const result = range(defaultScenario.ENEMY_ID);
      const event = extractRangeEvent(result);

      expect(event.type).toBe(EventType.COMBATANT_DID_ACQUIRE_RANGE);
      expect(event.actor).toBe(attackerActor.id);
      expect(event.location).toBe(attackerActor.location);
      expect(event.payload.target).toBe(defaultScenario.ENEMY_ID);
      expect(event.payload.range).toBe(50);
      expect(event.payload.direction).toBeOneOf([MovementDirection.FORWARD, MovementDirection.BACKWARD]);
    });

    it('should declare event to context', () => {
      const { context } = defaultScenario;
      const result = range(defaultScenario.ENEMY_ID);

      expect(context.declareEvent).toHaveBeenCalledWith(result[0]);
    });

    it('should include correct event metadata', () => {
      const { attackerActor } = defaultScenario;
      const customTrace = 'custom-range-trace';
      const result = range(defaultScenario.ENEMY_ID, customTrace);
      const event = extractRangeEvent(result);

      expect(event.trace).toBe(customTrace);
      expect(event.actor).toBe(attackerActor.id);
      expect(event.location).toBe(attackerActor.location);
    });

    it('should use generated trace when none provided', () => {
      const { context } = defaultScenario;
      const generatedTrace = 'generated-trace-123';
      context.uniqid = vi.fn().mockReturnValue(generatedTrace);

      const result = range(defaultScenario.ENEMY_ID);

      expect(result[0].trace).toBe(generatedTrace);
    });
  });

  describe('integration with combat system', () => {
    it('should use computeDistanceBetweenCombatants correctly', () => {
      const { scenario, attacker } = defaultScenario;
      range(defaultScenario.ENEMY_ID);

      expect(mockComputeDistance).toHaveBeenCalledWith(
        attacker,
        scenario.session.data.combatants.get(defaultScenario.ENEMY_ID)
      );
    });

    it('should work with different combatant configurations', () => {
      const customScenario = useCombatMovementTestScenario({
        attackerPosition: 75,
        enemyPosition: 225,
      });
      mockComputeDistance.mockReturnValue(150);

      const customRange = createCustomRangeMethod(customScenario);
      const result = customRange(customScenario.ENEMY_ID);

      expect(result).toHaveLength(1);
      const event = extractRangeEvent(result);
      expect(event.payload.range).toBe(150);
    });
  });

  describe('edge cases', () => {
    it('should handle very large distances', () => {
      mockComputeDistance.mockReturnValue(999);

      const result = range(defaultScenario.ENEMY_ID);
      const event = extractRangeEvent(result);

      expect(event.payload.range).toBe(999);
    });

    it('should handle fractional distances', () => {
      mockComputeDistance.mockReturnValue(42.7);

      const result = range(defaultScenario.ENEMY_ID);
      const event = extractRangeEvent(result);

      expect(event.payload.range).toBe(42.7);
    });

    it('should handle multiple range checks in sequence', () => {
      const { context } = defaultScenario;

      // First check
      mockComputeDistance.mockReturnValue(30);
      const result1 = range(defaultScenario.ENEMY_ID);

      // Second check with different distance
      mockComputeDistance.mockReturnValue(80);
      const result2 = range(defaultScenario.ENEMY_ID);

      expect(extractRangeEvent(result1).payload.range).toBe(30);
      expect(extractRangeEvent(result2).payload.range).toBe(80);
      expect(context.declareEvent).toHaveBeenCalledTimes(2);
    });
  });
});
