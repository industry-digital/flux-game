import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAdvanceMethod } from './advance';
import { CombatantDidMove, EventType } from '~/types/event';
import { Battlefield, CombatFacing, Team } from '~/types/combat';
import { createWorldEvent } from '~/worldkit/event';
import { distanceToAp, apToDistance } from '~/worldkit/physics/movement';
import { useCombatMovementTestScenario } from '../testing/movement';
import { MOVE_BY_AP, MOVE_BY_DISTANCE } from '~/worldkit/combat/combatant';

describe('createAdvanceMethod', () => {
  // Standard test scenario - most tests can use this
  let defaultScenario: ReturnType<typeof useCombatMovementTestScenario>;

  beforeEach(() => {
    // Create standard test scenario - 100m distance, default stats
    defaultScenario = useCombatMovementTestScenario();
  });

  describe('distance-based movement', () => {
    it('should move the combatant forward the specified distance when no target is specified', () => {
      const { advance, attacker } = defaultScenario;

      const result = advance(MOVE_BY_DISTANCE, 15);

      expect(result).toHaveLength(1);
      expect(attacker.position.coordinate).toBe(115); // 100 + 15 toward enemy at 200
      // Using real distanceToAp implementation
      expect(attacker.ap.eff.cur).toBeLessThan(6.0); // Some AP was consumed
    });

    it('should move the combatant forward the specified distance toward a specific target', () => {
      const { advance, attacker, enemyActor } = defaultScenario;

      const result = advance(MOVE_BY_DISTANCE, 20, enemyActor.id);

      expect(result).toHaveLength(1);
      expect(attacker.position.coordinate).toBe(120); // 100 + 20 toward enemy at 200
      expect(attacker.position.facing).toBe(CombatFacing.RIGHT); // Should turn toward target
    });

    it('should turn around before moving the specified distance toward a specific target behind', () => {
      const turnAroundScenario = useCombatMovementTestScenario({
        attackerPosition: 200,
        enemyPosition: 100 // Enemy behind attacker
      });
      const { advance, attacker, enemyActor } = turnAroundScenario;

      const result = advance(MOVE_BY_DISTANCE, 15, enemyActor.id);

      expect(result).toHaveLength(1);
      expect(attacker.position.coordinate).toBe(185); // 200 - 15 toward enemy at 100
      expect(attacker.position.facing).toBe(CombatFacing.LEFT); // Should turn toward target
    });

    it('should work when no enemies are present on battlefield', () => {
      // Test the pure "move forward" behavior with no enemies at all
      const soloScenario = useCombatMovementTestScenario({
        attackerPosition: 150,
        enemyPosition: 50, // We'll remove this enemy to test solo movement
      });
      const { advance, attacker, scenario, ENEMY_ID } = soloScenario;

      // Remove the enemy from the battlefield
      scenario.session.data.combatants.delete(ENEMY_ID);

      // Verify initial facing is RIGHT (default)
      expect(attacker.position.facing).toBe(CombatFacing.RIGHT);

      const result = advance(MOVE_BY_DISTANCE, 20);

      expect(result).toHaveLength(1);
      // New behavior: moves in facing direction even with no enemies
      expect(attacker.position.coordinate).toBe(170); // 150 + 20 (moved right)
      expect(attacker.position.facing).toBe(CombatFacing.RIGHT); // Facing unchanged
    });

    it('should move in current facing direction when no target specified', () => {
      // Test RIGHT facing movement
      const rightScenario = useCombatMovementTestScenario({
        attackerPosition: 150,
        enemyPosition: 50, // Enemy present but not targeted
      });
      const { advance: advanceRight, attacker: attackerRight } = rightScenario;

      // Verify initial facing is RIGHT
      expect(attackerRight.position.facing).toBe(CombatFacing.RIGHT);

      const resultRight = advanceRight(MOVE_BY_DISTANCE, 20);

      expect(resultRight).toHaveLength(1);
      // New behavior: move in facing direction (rightward)
      expect(attackerRight.position.coordinate).toBe(170); // 150 + 20 (moved right)
      expect(attackerRight.position.facing).toBe(CombatFacing.RIGHT); // Facing unchanged

      // Test LEFT facing movement
      const leftScenario = useCombatMovementTestScenario({
        attackerPosition: 150,
        enemyPosition: 250, // Enemy present but not targeted
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
      // New behavior: move in facing direction (leftward)
      expect(attackerLeft.position.coordinate).toBe(130); // 150 - 20 (moved left)
      expect(attackerLeft.position.facing).toBe(CombatFacing.LEFT); // Facing unchanged
    });

    it('should reject zero or negative distance when moving forward the specified distance', () => {
      const { advance, context } = defaultScenario;
      const result = advance(MOVE_BY_DISTANCE, 0);

      expect(result).toHaveLength(0);
      expect(context.declareError).toHaveBeenCalled();
    });

    it('should reject movement beyond battlefield boundaries', () => {
      // Use a smaller battlefield to make the boundary violation more obvious
      const customBattlefield: Battlefield = {
        length: 200, // Smaller battlefield
        margin: 50,
        cover: []
      };

      const boundaryScenario = useCombatMovementTestScenario({
        attackerPosition: 190, // Near boundary of 200m battlefield
        enemyPosition: 250, // Enemy beyond boundary - attacker will move toward boundary
        battlefield: customBattlefield
      });
      const { advance, context } = boundaryScenario;

      const result = advance(MOVE_BY_DISTANCE, 20);

      expect(result).toHaveLength(0);
      expect(context.declareError).toHaveBeenCalledWith(
        expect.stringContaining('battlefield boundary'),
        expect.any(String)
      );
    });

    it('should reject movement with insufficient AP', () => {
      const { advance, attacker, context } = defaultScenario;
      attacker.ap.eff.cur = 0.5; // Very low AP

      const result = advance(MOVE_BY_DISTANCE, 50);

      expect(result).toHaveLength(0);
      expect(context.declareError).toHaveBeenCalledWith(
        expect.stringContaining('would cost'),
        expect.any(String)
      );
    });
  });

  describe('AP-based movement', () => {
    it('should move maximum distance for given AP', () => {
      const { advance, attacker } = defaultScenario;

      const result = advance(MOVE_BY_AP, 2.0);

      expect(result).toHaveLength(1);
      expect(attacker.ap.eff.cur).toBe(4.0); // 6.0 - 2.0 AP spent
      // Using real apToDistance implementation
      expect(attacker.position.coordinate).toBeGreaterThan(100); // Should have moved forward
    });


    it('should reject zero or negative AP', () => {
      const { advance, context } = defaultScenario;

      const result = advance(MOVE_BY_AP, 0);

      expect(result).toHaveLength(0);
      expect(context.declareError).toHaveBeenCalledWith(
        'AP must be positive',
        expect.any(String)
      );
    });

    it('should reject AP exceeding current AP', () => {
      const { advance, attacker, context } = defaultScenario;
      attacker.ap.eff.cur = 3.0;

      const result = advance(MOVE_BY_AP, 5.0);

      expect(result).toHaveLength(0);
      expect(context.declareError).toHaveBeenCalledWith(
        expect.stringContaining('would exceed your remaining AP'),
        expect.any(String)
      );
    });
  });

  describe('error conditions', () => {
    it('should move in facing direction when no enemies found (same team)', () => {
      // Create scenario where both actors are on the same team (no enemies)
      const sameTeamScenario = useCombatMovementTestScenario({
        attackerStats: { pow: 50, fin: 30, res: 20 },
        enemyStats: { pow: 10, fin: 10, res: 10 },
      });

      // Manually set both combatants to the same team to simulate no enemies
      sameTeamScenario.attacker.team = Team.ALPHA;
      sameTeamScenario.enemy.team = Team.ALPHA;

      const { advance, attacker } = sameTeamScenario;

      // Verify initial facing is RIGHT
      expect(attacker.position.facing).toBe(CombatFacing.RIGHT);

      const result = advance(MOVE_BY_DISTANCE, 10);

      // New behavior: should succeed and move in facing direction
      expect(result).toHaveLength(1);
      expect(attacker.position.coordinate).toBe(110); // 100 + 10 (moved right)
      expect(attacker.position.facing).toBe(CombatFacing.RIGHT); // Facing unchanged
    });

    it('should reject when target not found', () => {
      const { advance, context } = defaultScenario;

      const result = advance(MOVE_BY_DISTANCE, 10, 'flux:actor:missing');

      expect(result).toHaveLength(0);
      expect(context.declareError).toHaveBeenCalledWith(
        expect.stringContaining('not found on battlefield'),
        expect.any(String)
      );
    });

    it('should reject when actor not in combat', () => {
      const { context, attackerActor, attacker, mockCreateWorldEvent, scenario } = defaultScenario;
      const { session } = scenario;

      // Remove the attacker from the combat session to simulate "not in combat"
      session.data.combatants.delete(defaultScenario.ATTACKER_ID);

      // Try to create advance method with combatant that's no longer in session
      const advance = createAdvanceMethod(
        context,
        session,
        attackerActor,
        attacker, // This combatant was removed from session
        {
          createWorldEvent: mockCreateWorldEvent as unknown as typeof createWorldEvent,
          distanceToAp: distanceToAp,
          apToDistance: apToDistance,
        }
      );

      // The correct behavior is to throw an error when actor not in combat
      expect(() => advance(MOVE_BY_DISTANCE, 10)).toThrow('Combatant flux:actor:attacker not found in combatants');
    });
  });

  describe('collision detection', () => {
    it('should stop movement when blocked by enemy', () => {
      const closeEnemyScenario = useCombatMovementTestScenario({
        attackerPosition: 100,
        enemyPosition: 110 // Enemy only 10m away
      });
      const { advance, context } = closeEnemyScenario;

      const result = advance(MOVE_BY_DISTANCE, 15);

      expect(result).toHaveLength(0);
      expect(context.declareError).toHaveBeenCalledWith(
        expect.stringContaining('Movement blocked by enemy'),
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
      expect(event).toMatchObject({
        type: EventType.COMBATANT_DID_MOVE,
        trace: expect.any(String),
        payload: {
          actor: attackerActor.id,
          cost: { ap: expect.any(Number) },
          from: { coordinate: 100, facing: CombatFacing.RIGHT, velocity: 0 },
          to: { coordinate: 115, facing: CombatFacing.RIGHT, velocity: 0 },
        },
      });

      expect(context.declareEvent).toHaveBeenCalledWith(event);
    });

    it('should indicate facing change in event when turning toward target', () => {
      const turnAroundScenario = useCombatMovementTestScenario({
        attackerPosition: 200,
        enemyPosition: 100 // Need to turn around
      });
      const { advance, attackerActor, enemyActor } = turnAroundScenario;

      const result = advance(MOVE_BY_DISTANCE, 15, enemyActor.id);

      expect(result).toHaveLength(1);
      const event = result[0] as CombatantDidMove;
      expect(event.payload.from.facing).toBe(CombatFacing.RIGHT);
      expect(event.payload.to.facing).toBe(CombatFacing.LEFT); // Should have turned
    });
  });

  describe('mass integration', () => {
    it('should use mass API for movement calculations', () => {
      const massTestScenario = useCombatMovementTestScenario({
        attackerMass: 75, // 75kg
      });
      const { advance, mockComputeActorMass, attackerActor } = massTestScenario;

      const result = advance(MOVE_BY_DISTANCE, 10);

      expect(mockComputeActorMass).toHaveBeenCalledWith(attackerActor);
    });

    it('should handle different actor masses correctly', () => {
      const heavyActorScenario = useCombatMovementTestScenario({
        attackerMass: 100, // 100kg - heavier actor
      });
      const { advance, mockComputeActorMass, attackerActor } = heavyActorScenario;

      const result = advance(MOVE_BY_DISTANCE, 20);

      expect(mockComputeActorMass).toHaveBeenCalledWith(attackerActor);
    });
  });

  describe('Position Rounding', () => {
    describe.each([
      { distance: 1.1, description: '1.1m (small fractional)' },
      { distance: 2.7, description: '2.7m (medium fractional)' },
      { distance: 5.333, description: '5.333m (repeating decimal)' },
      { distance: 10.999, description: '10.999m (near whole number)' },
      { distance: 15.001, description: '15.001m (tiny fraction)' },
      { distance: 20.5, description: '20.5m (half meter)' },
    ])('distance-based movement with $description', ({ distance }) => {
      it('should result in whole number position', () => {
        const { advance, attacker } = defaultScenario;

        const result = advance(MOVE_BY_DISTANCE, distance);

        // Position should always be a whole number
        expect(attacker.position.coordinate).toBe(Math.round(attacker.position.coordinate));
        expect(Number.isInteger(attacker.position.coordinate)).toBe(true);
      });
    });

    it('should round positions in event payloads to whole numbers', () => {
      const { advance } = defaultScenario;

      const result = advance(MOVE_BY_DISTANCE, 7.7);

      expect(result).toHaveLength(1);
      const event = result[0] as CombatantDidMove;

      // Event payload should contain whole number coordinates
      expect(Number.isInteger(event.payload.to.coordinate)).toBe(true);
      expect(event.payload.to.coordinate).toBe(Math.round(event.payload.to.coordinate));
    });

    it('should handle AP-based movement with whole number positions', () => {
      const { advance, attacker } = defaultScenario;

      // AP-based movement might result in fractional distances from apToDistance calculations
      advance(MOVE_BY_AP, 1.7);

      // Position should still be a whole number
      expect(Number.isInteger(attacker.position.coordinate)).toBe(true);
      expect(attacker.position.coordinate).toBe(Math.round(attacker.position.coordinate));
    });

    it('should maintain whole number positions after collision adjustments', () => {
      // Set up a scenario where collision detection might adjust the final position
      const closeEnemyScenario = useCombatMovementTestScenario({
        attackerPosition: 100,
        enemyPosition: 105 // Enemy close by
      });
      const { advance, attacker } = closeEnemyScenario;

      const result = advance(MOVE_BY_DISTANCE, 3.8); // Would get close to enemy

      // Even after collision adjustments, position should be whole number
      if (result.length > 0) {
        expect(Number.isInteger(attacker.position.coordinate)).toBe(true);
      }
    });

    it('should handle boundary conditions with whole number positions', () => {
      const boundaryScenario = useCombatMovementTestScenario({
        attackerPosition: 295,
        enemyPosition: 300 // Near boundary
      });
      const { advance, attacker } = boundaryScenario;

      const result = advance(MOVE_BY_DISTANCE, 3.3); // Might hit boundary

      // Position should be whole number even after boundary adjustments
      if (result.length > 0) {
        expect(Number.isInteger(attacker.position.coordinate)).toBe(true);
        expect(attacker.position.coordinate).toBeLessThanOrEqual(300);
      }
    });
  });

  describe('Edge Case Interactions', () => {
    it('should reject movement when collision detected', () => {
      // Set up enemy at 109m to block movement
      const collisionScenario = useCombatMovementTestScenario({
        attackerPosition: 100,
        enemyPosition: 109 // Enemy only 9m away, will block 10m movement
      });
      const { advance } = collisionScenario;

      // Try to move 10m but will be blocked by enemy
      const result = advance(MOVE_BY_DISTANCE, 10);

      // Should reject movement entirely (no events emitted)
      expect(result).toHaveLength(0);
    });

    it('should reject movement when boundary exceeded', () => {
      // Test with custom battlefield that has a shorter length (200m instead of default 300m)
      const customBattlefield: Battlefield = {
        length: 200,
        margin: 50,
        cover: []
      };

      const boundaryScenario = useCombatMovementTestScenario({
        attackerPosition: 190, // Near the 200m boundary
        enemyPosition: 50, // Far away to avoid collision
        battlefield: customBattlefield
      });

      const { advance, scenario } = boundaryScenario;

      // Verify the custom battlefield was propagated correctly
      expect(scenario.session.data.battlefield.length).toBe(200);
      expect(scenario.session.data.battlefield.margin).toBe(50);

      // Remove enemy to test pure boundary violation (no collision)
      scenario.session.data.combatants.delete(boundaryScenario.ENEMY_ID);

      // Try to move 20m (would exceed 200m boundary: 190 + 20 = 210)
      const result = advance(MOVE_BY_DISTANCE, 20);

      // Should reject movement entirely (no events emitted)
      expect(result).toHaveLength(0);
    });
  });

  describe('Trace Propagation', () => {
    it('should propagate custom trace to WorldEvent payloads', () => {
      const customTrace = 'custom-advance-trace-123';
      const { advance, attackerActor } = defaultScenario;

      const result = advance(MOVE_BY_DISTANCE, 10, undefined, customTrace);

      expect(result).toHaveLength(1);
      expect(result[0].trace).toBe(customTrace);
      expect(result[0]).toMatchObject({
        trace: customTrace,
      });
    });

    it('should use generated trace when none provided', () => {
      const { advance, context } = defaultScenario;

      // Mock context.uniqid to return a known value
      const generatedTrace = 'generated-advance-trace-456';
      context.uniqid = vi.fn().mockReturnValue(generatedTrace);

      const result = advance(MOVE_BY_DISTANCE, 10); // No trace provided - should use default

      expect(result).toHaveLength(1);
      expect(result[0].trace).toBe(generatedTrace);
      expect(context.uniqid).toHaveBeenCalled();
      expect(result[0]).toMatchObject({
        trace: generatedTrace,
      });
    });
  });
});
