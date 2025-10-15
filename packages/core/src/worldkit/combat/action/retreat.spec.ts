import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCombatMovementTestScenario } from '../testing/movement';
import { CombatantDidMove, EventType } from '~/types/event';
import { CombatFacing, MovementDirection } from '~/types/combat';
import { MOVE_BY_AP, MOVE_BY_DISTANCE } from '~/worldkit/combat/combatant';
import { extractFirstEventOfType } from '~/testing/event';

describe('Retreat Method', () => {
  // Standard test scenario - most tests can use this
  let defaultScenario: ReturnType<typeof useCombatMovementTestScenario>;

  beforeEach(() => {
    // Create standard test scenario - 10m distance, close combat
    defaultScenario = useCombatMovementTestScenario({
      attackerPosition: 100,
      enemyPosition: 110, // Close combat scenario
    });
  });


  describe('Basic Functionality', () => {
    it('should move combatant backward by specified distance', () => {
      const { retreat, attacker } = defaultScenario;
      const initialPosition = attacker.position.coordinate;

      const result = retreat(MOVE_BY_DISTANCE, 5);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(EventType.COMBATANT_DID_MOVE);
      expect(attacker.position.coordinate).toBeLessThan(initialPosition); // Moved backward
    });

    it('should create COMBATANT_DID_MOVE event', () => {
      const { retreat, attacker, attackerActor } = defaultScenario;
      const initialPosition = attacker.position.coordinate;

      const result = retreat(MOVE_BY_DISTANCE, 5);

      expect(result).toHaveLength(1);
      const moveEvent: CombatantDidMove = extractFirstEventOfType<CombatantDidMove>(result, EventType.COMBATANT_DID_MOVE)!;
      expect(moveEvent).toMatchObject({
        type: EventType.COMBATANT_DID_MOVE,
        location: attackerActor.location,
        actor: attackerActor.id,
        payload: {
          cost: expect.objectContaining({ ap: expect.any(Number) }),
          from: expect.objectContaining({ coordinate: initialPosition }),
          to: expect.objectContaining({ coordinate: expect.any(Number) }),
          distance: expect.any(Number),
          direction: MovementDirection.BACKWARD,
        }
      });
    });

    it('should handle AP-based movement', () => {
      const { retreat, attacker } = defaultScenario;
      const initialAP = attacker.ap.eff.cur;

      const result = retreat(MOVE_BY_AP, 2.0);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(EventType.COMBATANT_DID_MOVE);
      expect(attacker.ap.eff.cur).toBeLessThan(initialAP); // AP consumed
    });

    it('should call declareEvent on context', () => {
      const { retreat, context } = defaultScenario;

      retreat(MOVE_BY_DISTANCE, 5);

      expect(context.declareEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.COMBATANT_DID_MOVE,
          payload: expect.objectContaining({
            cost: expect.any(Object),
            from: expect.any(Object),
            to: expect.any(Object)
          })
        })
      );
    });
  });

  describe('Input Validation', () => {
    it('should reject zero or negative distance', () => {
      const { retreat, context } = defaultScenario;

      const result = retreat(MOVE_BY_DISTANCE, 0);

      expect(result).toHaveLength(0);
      expect(context.declareError).toHaveBeenCalled();
    });

    it('should reject zero or negative AP', () => {
      const { retreat, context } = defaultScenario;

      const result = retreat(MOVE_BY_AP, 0);

      expect(result).toHaveLength(0);
      expect(context.declareError).toHaveBeenCalled();
    });

    it('should reject movement with insufficient AP', () => {
      const { retreat, attacker, context } = defaultScenario;
      attacker.ap.eff.cur = 0.5; // Very low AP

      const result = retreat(MOVE_BY_DISTANCE, 50); // Would cost significant AP

      expect(result).toHaveLength(0);
      expect(context.declareError).toHaveBeenCalled();
    });

    it('should reject AP exceeding current AP', () => {
      const { retreat, attacker, context } = defaultScenario;
      attacker.ap.eff.cur = 3.0;

      const result = retreat(MOVE_BY_AP, 5.0);

      expect(result).toHaveLength(0);
      expect(context.declareError).toHaveBeenCalled();
    });
  });

  describe('Boundary Conditions', () => {
    it('should reject movement when boundary exceeded', () => {
      const boundaryScenario = useCombatMovementTestScenario({
        attackerPosition: 5, // Near left boundary
        enemyPosition: 15
      });
      const { retreat, context } = boundaryScenario;

      const result = retreat(MOVE_BY_DISTANCE, 10); // Would go to -5, beyond 0m limit

      expect(result).toHaveLength(0);
      expect(context.declareError).toHaveBeenCalled();
    });

    it('should handle movement to exact boundary', () => {
      const boundaryScenario = useCombatMovementTestScenario({
        attackerPosition: 5, // 5m from left boundary
        enemyPosition: 15
      });
      const { retreat, attacker } = boundaryScenario;

      const result = retreat(MOVE_BY_DISTANCE, 5); // Exactly to boundary

      expect(result).toHaveLength(1);
      expect(attacker.position.coordinate).toBe(0); // At left boundary
    });
  });

  describe('Event Generation', () => {
    it('should generate COMBATANT_DID_MOVE event with correct payload', () => {
      const { retreat, attackerActor, context } = defaultScenario;

      const result = retreat(MOVE_BY_DISTANCE, 5);
      const event = result[0] as CombatantDidMove;

      expect(result).toHaveLength(1);
      expect(event).toMatchObject({
        type: EventType.COMBATANT_DID_MOVE,
        trace: expect.any(String),
        actor: attackerActor.id,
        payload: {
          cost: { ap: expect.any(Number) },
          from: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 },
          to: { coordinate: 95, facing: CombatFacing.RIGHT, speed: 0 }, // Moved backward
          distance: 5,
          direction: MovementDirection.BACKWARD,
        },
      });
    });

    it('should maintain facing direction during retreat', () => {
      const { retreat } = defaultScenario;

      const result = retreat(MOVE_BY_DISTANCE, 5);

      expect(result).toHaveLength(1);
      const event = result[0] as CombatantDidMove;
      expect(event.payload.from.facing).toBe(CombatFacing.RIGHT);
      expect(event.payload.to.facing).toBe(CombatFacing.RIGHT); // Should maintain facing
    });
  });

  describe('Mass Integration', () => {
    it('should use mass API for movement calculations', () => {
      const { retreat, mockComputeActorMass, attackerActor } = defaultScenario;

      retreat(MOVE_BY_DISTANCE, 10);

      expect(mockComputeActorMass).toHaveBeenCalledWith(attackerActor);
    });

    it('should handle different actor masses correctly', () => {
      const heavyScenario = useCombatMovementTestScenario({
        attackerMass: 100, // 100kg - heavier actor
      });
      const { retreat, mockComputeActorMass, attackerActor } = heavyScenario;

      retreat(MOVE_BY_DISTANCE, 20);

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
        const roundingScenario = useCombatMovementTestScenario({
          attackerPosition: 50, // Give more room for movement
          enemyPosition: 60
        });
        const { retreat, attacker } = roundingScenario;

        retreat(MOVE_BY_DISTANCE, distance);

        // Position should always be a whole number
        expect(attacker.position.coordinate).toBe(Math.round(attacker.position.coordinate));
        expect(Number.isInteger(attacker.position.coordinate)).toBe(true);
      });
    });

    it('should round positions in event payloads to whole numbers', () => {
      const roundingScenario = useCombatMovementTestScenario({
        attackerPosition: 50,
        enemyPosition: 60
      });
      const { retreat } = roundingScenario;

      const result = retreat(MOVE_BY_DISTANCE, 7.7);

      expect(result).toHaveLength(1);
      const event = result[0] as CombatantDidMove;

      // Event payload should contain whole number coordinates
      expect(Number.isInteger(event.payload.to.coordinate)).toBe(true);
      expect(event.payload.to.coordinate).toBe(Math.round(event.payload.to.coordinate));
    });

    it('should handle AP-based movement with whole number positions', () => {
      const roundingScenario = useCombatMovementTestScenario({
        attackerPosition: 50,
        enemyPosition: 60
      });
      const { retreat, attacker } = roundingScenario;

      // AP-based movement might result in fractional distances from apToDistance calculations
      retreat(MOVE_BY_AP, 1.7);

      // Position should still be a whole number
      expect(Number.isInteger(attacker.position.coordinate)).toBe(true);
      expect(attacker.position.coordinate).toBe(Math.round(attacker.position.coordinate));
    });
  });

  describe('Trace Propagation', () => {
    it('should propagate custom trace to WorldEvent payloads', () => {
      const { retreat, attackerActor } = defaultScenario;
      const customTrace = 'custom-retreat-trace-123';

      const result = retreat(MOVE_BY_DISTANCE, 10, customTrace);

      expect(result).toHaveLength(1);
      expect(result[0].trace).toBe(customTrace);
      expect(result[0]).toMatchObject({
        type: EventType.COMBATANT_DID_MOVE,
        trace: customTrace,
        payload: expect.any(Object)
      });
    });

    it('should use generated trace when none provided', () => {
      const { retreat, context, attackerActor } = defaultScenario;

      // Mock context.uniqid to return a known value
      const generatedTrace = 'generated-retreat-trace-456';
      context.uniqid = vi.fn().mockReturnValue(generatedTrace);

      const result = retreat(MOVE_BY_DISTANCE, 10); // No trace provided

      expect(result).toHaveLength(1);
      expect(result[0].trace).toBe(generatedTrace);
      expect(context.uniqid).toHaveBeenCalled();
      expect(result[0]).toMatchObject({
        trace: generatedTrace,
      });
    });
  });
});
