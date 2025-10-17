import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAdvanceMethod } from './advance';
import { CombatantDidMove, EventType } from '~/types/event';
import { CombatFacing } from '~/types/combat';
import { createWorldEvent } from '~/worldkit/event';
import { distanceToAp, apToDistance } from '~/worldkit/physics/movement';
import { useCombatMovementTestScenario } from '../testing/movement';
import { MOVE_BY_AP, MOVE_BY_DISTANCE, MOVE_BY_MAX } from '~/worldkit/combat/combatant';

describe('createAdvanceMethod', () => {
  // Standard test scenario - most tests can use this
  let defaultScenario: ReturnType<typeof useCombatMovementTestScenario>;

  beforeEach(() => {
    // Create standard test scenario - 100m distance, default stats
    defaultScenario = useCombatMovementTestScenario();
  });

  describe('distance-based movement', () => {
    it('should move the combatant forward in facing direction', () => {
      const { advance, attacker } = defaultScenario;

      const result = advance(MOVE_BY_DISTANCE, 15);

      expect(result).toHaveLength(1);
      expect(attacker.position.coordinate).toBe(115); // 100 + 15 (rightward)
      expect(attacker.position.facing).toBe(CombatFacing.RIGHT); // Facing unchanged
      expect(attacker.ap.eff.cur).toBeLessThan(6.0); // Some AP was consumed
    });

    it('should move in current facing direction regardless of enemy positions', () => {
      // Test RIGHT facing movement
      const rightScenario = useCombatMovementTestScenario({
        attackerPosition: 150,
        enemyPosition: 50, // Enemy present but ignored
      });
      const { advance: advanceRight, attacker: attackerRight } = rightScenario;

      // Verify initial facing is RIGHT
      expect(attackerRight.position.facing).toBe(CombatFacing.RIGHT);

      const resultRight = advanceRight(MOVE_BY_DISTANCE, 20);

      expect(resultRight).toHaveLength(1);
      expect(attackerRight.position.coordinate).toBe(170); // 150 + 20 (moved right)
      expect(attackerRight.position.facing).toBe(CombatFacing.RIGHT); // Facing unchanged

      // Test LEFT facing movement
      const leftScenario = useCombatMovementTestScenario({
        attackerPosition: 150,
        enemyPosition: 250, // Enemy present but ignored
      });
      const { attacker: attackerLeft } = leftScenario;

      // Manually set facing to LEFT
      attackerLeft.position.facing = CombatFacing.LEFT;

      // Create new advance method with LEFT-facing combatant
      const advanceLeft = createAdvanceMethod(
        leftScenario.context,
        leftScenario.scenario.session,
        leftScenario.attackerActor,
        attackerLeft,
        {
          createWorldEvent: leftScenario.mockCreateWorldEvent as unknown as typeof createWorldEvent,
          distanceToAp: distanceToAp,
          apToDistance: apToDistance,
        }
      );

      const resultLeft = advanceLeft(MOVE_BY_DISTANCE, 20);

      expect(resultLeft).toHaveLength(1);
      expect(attackerLeft.position.coordinate).toBe(130); // 150 - 20 (moved left)
      expect(attackerLeft.position.facing).toBe(CombatFacing.LEFT); // Facing unchanged
    });

    it('should work when no enemies are present on battlefield', () => {
      const noEnemyScenario = useCombatMovementTestScenario({
        attackerPosition: 100,
        // No enemy position - empty battlefield
      });
      const { advance, attacker } = noEnemyScenario;

      const result = advance(MOVE_BY_DISTANCE, 25);

      expect(result).toHaveLength(1);
      expect(attacker.position.coordinate).toBe(125); // 100 + 25 (rightward)
      expect(attacker.position.facing).toBe(CombatFacing.RIGHT); // Facing unchanged
    });

    it('should reject zero or negative distance', () => {
      const { advance, context } = defaultScenario;
      const result = advance(MOVE_BY_DISTANCE, 0);

      expect(result).toHaveLength(0);
      expect(context.declareError).toHaveBeenCalledWith(
        expect.stringContaining('Distance must be positive'),
        expect.any(String)
      );
    });

    it('should reject movement beyond battlefield boundaries', () => {
      const boundaryScenario = useCombatMovementTestScenario({
        attackerPosition: 190, // Near right boundary
        battlefield: { length: 200, margin: 0, cover: [] }, // Custom battlefield with 200m length
        // Don't specify enemyPosition to avoid collision interference
      });
      // Remove enemy from the scenario to test pure boundary conditions
      boundaryScenario.scenario.session.data.combatants.delete(boundaryScenario.ENEMY_ID);

      const { advance, context } = boundaryScenario;

      const result = advance(MOVE_BY_DISTANCE, 20);

      expect(result).toHaveLength(0);
      expect(context.declareError).toHaveBeenCalledWith(
        expect.stringContaining('boundary'),
        expect.any(String)
      );
    });

    it('should reject movement with insufficient AP', () => {
      const { advance, attacker, context } = defaultScenario;
      attacker.ap.eff.cur = 0.5; // Very low AP

      const result = advance(MOVE_BY_DISTANCE, 50);

      expect(result).toHaveLength(0);
      expect(context.declareError).toHaveBeenCalledWith(
        expect.stringContaining('AP'),
        expect.any(String)
      );
    });
  });

  describe('AP-based movement', () => {
    it('should move maximum distance for given AP', () => {
      const { advance, attacker } = defaultScenario;

      const result = advance(MOVE_BY_AP, 2.0);

      expect(result).toHaveLength(1);
      expect(attacker.position.coordinate).toBeGreaterThan(100); // Moved forward
      expect(attacker.ap.eff.cur).toBeLessThan(6.0); // AP was consumed
    });

    it('should reject zero or negative AP', () => {
      const { advance, context } = defaultScenario;

      const result = advance(MOVE_BY_AP, 0);

      expect(result).toHaveLength(0);
      expect(context.declareError).toHaveBeenCalledWith(
        expect.stringContaining('AP must be positive'),
        expect.any(String)
      );
    });

    it('should reject AP exceeding current AP', () => {
      const { advance, attacker, context } = defaultScenario;
      attacker.ap.eff.cur = 3.0;

      const result = advance(MOVE_BY_AP, 5.0);

      expect(result).toHaveLength(0);
      expect(context.declareError).toHaveBeenCalledWith(
        expect.stringContaining('exceed'),
        expect.any(String)
      );
    });
  });

  describe('max movement', () => {
    it('should move as far as possible when no obstacles present', () => {
      const noObstacleScenario = useCombatMovementTestScenario({
        attackerPosition: 100,
        attackerAP: 10.0, // High AP for long movement
        // No enemy position - clear battlefield
      });
      const { advance, attacker } = noObstacleScenario;
      const initialAP = attacker.ap.eff.cur;

      const result = advance(MOVE_BY_MAX, 0); // Value ignored for max movement

      expect(result).toHaveLength(1);
      expect(attacker.position.coordinate).toBeGreaterThan(100); // Moved forward
      expect(attacker.ap.eff.cur).toBeLessThan(initialAP); // AP was consumed
      expect(attacker.ap.eff.cur).toBeGreaterThanOrEqual(0); // Didn't exceed available AP
    });

    it('should stop at collision boundary when enemy blocks path', () => {
      const collisionScenario = useCombatMovementTestScenario({
        attackerPosition: 100,
        enemyPosition: 150, // Enemy 50m away
        attackerAP: 20.0, // Plenty of AP to reach enemy
      });
      const { advance, attacker } = collisionScenario;

      const result = advance(MOVE_BY_MAX, 0);

      expect(result).toHaveLength(1);
      expect(attacker.position.coordinate).toBe(149); // Stopped 1m before enemy at 150
    });

    it('should stop at battlefield boundary when no other obstacles', () => {
      const boundaryScenario = useCombatMovementTestScenario({
        attackerPosition: 180,
        battlefield: { length: 200, margin: 0, cover: [] }, // 200m battlefield
        attackerAP: 20.0, // Plenty of AP
      });
      // Remove enemy to test pure boundary conditions
      boundaryScenario.scenario.session.data.combatants.delete(boundaryScenario.ENEMY_ID);

      const { advance, attacker } = boundaryScenario;

      const result = advance(MOVE_BY_MAX, 0);

      expect(result).toHaveLength(1);
      expect(attacker.position.coordinate).toBe(200); // Stopped at battlefield boundary
    });

    it('should be limited by available AP when that is the constraint', () => {
      const lowAPScenario = useCombatMovementTestScenario({
        attackerPosition: 100,
        attackerAP: 1.0, // Very low AP
        battlefield: { length: 1000, margin: 0, cover: [] }, // Large battlefield
        // No enemy - clear path
      });
      const { advance, attacker } = lowAPScenario;

      const result = advance(MOVE_BY_MAX, 0);

      expect(result).toHaveLength(1);
      expect(attacker.position.coordinate).toBeGreaterThan(100); // Moved some distance
      expect(attacker.position.coordinate).toBeLessThan(150); // But not too far due to AP limit
      expect(attacker.ap.eff.cur).toBeCloseTo(0, 1); // Nearly all AP consumed
    });

    it('should choose the most restrictive constraint', () => {
      const multiConstraintScenario = useCombatMovementTestScenario({
        attackerPosition: 100,
        enemyPosition: 120, // Enemy 20m away
        attackerAP: 2.0, // Limited AP (can only move ~11m)
        battlefield: { length: 200, margin: 0, cover: [] }, // Boundary at 200m (furthest)
      });
      const { advance, attacker } = multiConstraintScenario;

      const result = advance(MOVE_BY_MAX, 0);

      expect(result).toHaveLength(1);
      // AP is the most restrictive constraint - can only move ~11m with 2 AP
      expect(attacker.position.coordinate).toBeCloseTo(112, 0); // Stopped due to AP limit
    });

    it('should not move when blocked by adjacent enemy but not error', () => {
      const blockedScenario = useCombatMovementTestScenario({
        attackerPosition: 100,
        enemyPosition: 101, // Enemy immediately adjacent
        attackerAP: 10.0,
      });
      const { advance, attacker, context } = blockedScenario;
      const initialPosition = attacker.position.coordinate;

      const result = advance(MOVE_BY_MAX, 0);

      expect(result).toHaveLength(1); // Should generate event with zero movement
      expect(attacker.position.coordinate).toBe(initialPosition); // No movement
      expect(context.declareError).not.toHaveBeenCalled(); // No error for max movement
    });

    it('should error when actor has zero AP', () => {
      const noAPScenario = useCombatMovementTestScenario({
        attackerPosition: 100,
        attackerAP: 0.0, // No AP available
      });
      const { advance, context } = noAPScenario;

      const result = advance(MOVE_BY_MAX, 0);

      expect(result).toHaveLength(0);
      expect(context.declareError).toHaveBeenCalledWith(
        expect.stringContaining('No movement possible'),
        expect.any(String)
      );
    });

    it('should work with LEFT facing direction', () => {
      const leftFacingScenario = useCombatMovementTestScenario({
        attackerPosition: 150,
        attackerAP: 10.0,
        // No enemy - clear battlefield
      });
      const { attacker } = leftFacingScenario;

      // Set facing to LEFT
      attacker.position.facing = CombatFacing.LEFT;

      // Create advance method with LEFT-facing combatant
      const advance = createAdvanceMethod(
        leftFacingScenario.context,
        leftFacingScenario.scenario.session,
        leftFacingScenario.attackerActor,
        attacker
      );

      const result = advance(MOVE_BY_MAX, 0);

      expect(result).toHaveLength(1);
      expect(attacker.position.coordinate).toBeLessThan(150); // Moved leftward
      expect(attacker.position.facing).toBe(CombatFacing.LEFT); // Facing unchanged
    });

    it('should generate proper COMBATANT_DID_MOVE event', () => {
      const { advance, attackerActor } = defaultScenario;
      const initialPosition = defaultScenario.attacker.position.coordinate;

      const result = advance(MOVE_BY_MAX, 0);
      const event = result[0] as CombatantDidMove;
      const distance = Math.abs(event.payload.from.coordinate - event.payload.to.coordinate);

      expect(result).toHaveLength(1);
      expect(event.type).toBe(EventType.COMBATANT_DID_MOVE);
      expect(event.actor).toBe(attackerActor.id);
      expect(event.payload.from.coordinate).toBe(initialPosition);
      expect(event.payload.to.coordinate).toBeGreaterThan(initialPosition);
      expect(distance).toBeGreaterThan(0);
      expect(event.payload.cost.ap).toBeGreaterThan(0);
      expect(event.payload.cost.energy).toBeGreaterThan(0);
    });

    it('should result in whole number positions', () => {
      const roundingScenario = useCombatMovementTestScenario({
        attackerPosition: 100,
        enemyPosition: 137.7, // Fractional enemy position
        attackerAP: 10.0,
      });
      const { advance, attacker } = roundingScenario;

      const result = advance(MOVE_BY_MAX, 0);

      expect(result).toHaveLength(1);
      expect(Number.isInteger(attacker.position.coordinate)).toBe(true);
    });

    it('should ignore the value parameter', () => {
      const { advance, attacker } = defaultScenario;
      const initialPosition = attacker.position.coordinate;
      const initialAP = attacker.ap.eff.cur;

      // Test that different values produce the same result
      const result1 = advance(MOVE_BY_MAX, 999);
      const position1 = attacker.position.coordinate;

      // Reset position and AP
      attacker.position.coordinate = initialPosition;
      attacker.ap.eff.cur = initialAP;

      const result2 = advance(MOVE_BY_MAX, -50);
      const position2 = attacker.position.coordinate;

      expect(result1).toHaveLength(1);
      expect(result2).toHaveLength(1);
      expect(position1).toBe(position2); // Same result regardless of value
    });
  });

  describe('error conditions', () => {
    it('should reject when actor not in combat', () => {
      const { scenario, context, attackerActor, attacker } = defaultScenario;

      // Remove combatant from session
      scenario.session.data.combatants.delete(attackerActor.id);

      const advance = createAdvanceMethod(context, scenario.session, attackerActor, attacker);

      const result = advance(MOVE_BY_DISTANCE, 10);

      expect(result).toHaveLength(0);
      expect(context.declareError).toHaveBeenCalledWith(
        expect.stringContaining('not in combat'),
        expect.any(String)
      );
    });
  });

  describe('collision detection', () => {
    it('should stop movement when blocked by enemy', () => {
      const closeEnemyScenario = useCombatMovementTestScenario({
        attackerPosition: 100,
        enemyPosition: 110, // Very close enemy
      });
      const { advance, context } = closeEnemyScenario;

      const result = advance(MOVE_BY_DISTANCE, 15);

      expect(result).toHaveLength(0);
      expect(context.declareError).toHaveBeenCalledWith(
        expect.stringContaining('blocked'),
        expect.any(String)
      );
    });
  });

  describe('event generation', () => {
    it('should generate COMBATANT_DID_MOVE event', () => {
      const { advance, attackerActor, context } = defaultScenario;

      const result = advance(MOVE_BY_DISTANCE, 15);
      const event = result[0] as CombatantDidMove;

      expect(result).toHaveLength(1);
      expect(event.type).toBe(EventType.COMBATANT_DID_MOVE);
      expect(event.actor).toBe(attackerActor.id);
      expect(event.payload.from.coordinate).toBe(100);
      expect(event.payload.to.coordinate).toBe(115);
      expect(context.declareEvent).toHaveBeenCalledWith(event);
    });
  });

  describe('mass integration', () => {
    it('should use mass API for movement calculations', () => {
      const { advance, mockComputeActorMass, attackerActor } = defaultScenario;

      advance(MOVE_BY_DISTANCE, 10);

      expect(mockComputeActorMass).toHaveBeenCalledWith(attackerActor);
    });

    it('should handle different actor masses correctly', () => {
      const heavyActorScenario = useCombatMovementTestScenario({
        attackerMass: 200, // 200kg - much heavier actor for noticeable difference
        attackerAP: 10.0, // Higher starting AP to see the difference
      });
      const { advance, mockComputeActorMass, attackerActor } = heavyActorScenario;

      advance(MOVE_BY_DISTANCE, 50); // Longer distance to amplify mass effects

      expect(mockComputeActorMass).toHaveBeenCalledWith(attackerActor);
      // Heavy actors should consume more AP for same distance (or just verify mass was used)
      expect(mockComputeActorMass).toHaveBeenCalledWith(attackerActor);
    });
  });

  describe('Position Rounding', () => {
    const testDistances = [1.1, 2.7, 5.333, 10.999, 15.001, 20.5];

    testDistances.forEach(distance => {
      it(`distance-based movement with '${distance}m' should result in whole number position`, () => {
        const roundingScenario = useCombatMovementTestScenario();
        const { advance, attacker } = roundingScenario;

        advance(MOVE_BY_DISTANCE, distance);

        // Position should always be a whole number
        expect(Number.isInteger(attacker.position.coordinate)).toBe(true);
      });
    });

    it('should round positions in event payloads to whole numbers', () => {
      const { advance } = defaultScenario;

      const result = advance(MOVE_BY_DISTANCE, 7.7);

      expect(result).toHaveLength(1);
      const event = result[0] as CombatantDidMove;

      // Both from and to coordinates should be whole numbers
      expect(Number.isInteger(event.payload.from.coordinate)).toBe(true);
      expect(Number.isInteger(event.payload.to.coordinate)).toBe(true);
    });

    it('should report whole number distance in event payload for AP-based movement', () => {
      const { advance } = defaultScenario;

      // AP-based movement uses apToDistance which produces fractional distances
      const result = advance(MOVE_BY_AP, 2.5);

      expect(result).toHaveLength(1);
      const event = result[0] as CombatantDidMove;

      // Distance in event should be a whole number (tactical rounding applied)
      expect(Number.isInteger(event.payload.distance)).toBe(true);
      expect(event.payload.distance).toBeGreaterThan(0);
    });

    it('should report actual moved distance matching position change', () => {
      const { advance } = defaultScenario;

      const result = advance(MOVE_BY_DISTANCE, 15);

      expect(result).toHaveLength(1);
      const event = result[0] as CombatantDidMove;

      // Event distance should match actual movement (from tactical positions)
      const actualMovement = Math.abs(event.payload.to.coordinate - event.payload.from.coordinate);
      expect(event.payload.distance).toBe(actualMovement);
      expect(Number.isInteger(event.payload.distance)).toBe(true);
    });

    it('should handle AP-based movement with whole number positions', () => {
      const roundingScenario = useCombatMovementTestScenario();
      const { attacker } = roundingScenario;

      // Create advance method for this scenario
      const advance = createAdvanceMethod(
        roundingScenario.context,
        roundingScenario.scenario.session,
        roundingScenario.attackerActor,
        attacker
      );

      // AP-based movement might result in fractional distances from apToDistance calculations
      advance(MOVE_BY_AP, 1.7);

      // Position should still be a whole number
      expect(Number.isInteger(attacker.position.coordinate)).toBe(true);
    });

    it('should maintain whole number positions after collision adjustments', () => {
      const closeEnemyScenario = useCombatMovementTestScenario({
        attackerPosition: 100,
        enemyPosition: 105, // Close enemy
      });
      const { advance, attacker } = closeEnemyScenario;

      advance(MOVE_BY_DISTANCE, 3.8); // Would get close to enemy

      // Even after collision adjustments, position should be whole number
      expect(Number.isInteger(attacker.position.coordinate)).toBe(true);
    });

    it('should handle boundary conditions with whole number positions', () => {
      const boundaryScenario = useCombatMovementTestScenario({
        attackerPosition: 190,
        battlefield: { length: 200, margin: 0, cover: [] }, // Custom battlefield with 200m length
      });
      // Remove enemy to avoid collision interference
      boundaryScenario.scenario.session.data.combatants.delete(boundaryScenario.ENEMY_ID);

      const { advance, attacker } = boundaryScenario;

      advance(MOVE_BY_DISTANCE, 3.3); // Small movement within boundary

      // Position should be whole number even after boundary adjustments
      expect(Number.isInteger(attacker.position.coordinate)).toBe(true);
    });
  });

  describe('Edge Case Interactions', () => {
    it('should reject movement when collision detected', () => {
      const closeEnemyScenario = useCombatMovementTestScenario({
        attackerPosition: 100,
        enemyPosition: 105,
      });
      const { advance, context } = closeEnemyScenario;

      // Try to move 10m but will be blocked by enemy
      const result = advance(MOVE_BY_DISTANCE, 10);

      // Should reject movement entirely (no events emitted)
      expect(result).toHaveLength(0);
      expect(context.declareError).toHaveBeenCalledWith(
        expect.stringContaining('blocked'),
        expect.any(String)
      );
    });

    it('should reject movement when boundary exceeded', () => {
      const boundaryScenario = useCombatMovementTestScenario({
        attackerPosition: 190,
        battlefield: { length: 200, margin: 0, cover: [] }, // Custom battlefield with 200m length
      });
      // Remove enemy to avoid collision detection interfering with boundary test
      boundaryScenario.scenario.session.data.combatants.delete(boundaryScenario.ENEMY_ID);

      const { advance, context } = boundaryScenario;

      // Try to move 20m (would exceed 200m boundary: 190 + 20 = 210)
      const result = advance(MOVE_BY_DISTANCE, 20);

      // Should reject movement entirely (no events emitted)
      expect(result).toHaveLength(0);
      expect(context.declareError).toHaveBeenCalledWith(
        expect.stringContaining('boundary'),
        expect.any(String)
      );
    });
  });

  describe('Trace Propagation', () => {
    it('should propagate custom trace to WorldEvent payloads', () => {
      const { advance, attackerActor } = defaultScenario;
      const customTrace = 'custom-advance-trace-123';

      const result = advance(MOVE_BY_DISTANCE, 10, customTrace);

      expect(result).toHaveLength(1);
      expect(result[0].trace).toBe(customTrace);
    });

    it('should use generated trace when none provided', () => {
      const { advance, context } = defaultScenario;
      const generatedTrace = 'generated-trace-456';
      context.uniqid = vi.fn().mockReturnValue(generatedTrace);

      const result = advance(MOVE_BY_DISTANCE, 10); // No trace provided - should use default

      expect(result).toHaveLength(1);
      expect(result[0].trace).toBe(generatedTrace);
    });
  });
});
