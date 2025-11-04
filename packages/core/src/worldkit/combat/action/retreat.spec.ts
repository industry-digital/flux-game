import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCombatMovementTestScenario } from '../testing/movement';
import { ActorDidMoveInCombat, EventType } from '~/types/event';
import { CombatFacing, MovementDirection } from '~/types/combat';
import { MOVE_BY_AP, MOVE_BY_DISTANCE, MOVE_BY_MAX } from '~/worldkit/combat/combatant';
import { createCombatTurnDidEndEvent, extractFirstEventOfType } from '~/testing/event';
import { getCurrentAp, setCurrentAp } from '~/worldkit/combat/ap';
import { DEFAULT_LOCATION } from '~/testing/constants';

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
      expect(result[0].type).toBe(EventType.ACTOR_DID_MOVE_IN_COMBAT);
      expect(attacker.position.coordinate).toBeLessThan(initialPosition); // Moved backward
    });

    it('should create COMBATANT_DID_MOVE event', () => {
      const { retreat, attacker, attackerActor } = defaultScenario;
      const initialPosition = attacker.position.coordinate;

      const result = retreat(MOVE_BY_DISTANCE, 5);

      expect(result).toHaveLength(1);
      const moveEvent: ActorDidMoveInCombat = extractFirstEventOfType<ActorDidMoveInCombat>(result, EventType.ACTOR_DID_MOVE_IN_COMBAT)!;
      expect(moveEvent).toMatchObject({
        type: EventType.ACTOR_DID_MOVE_IN_COMBAT,
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
      const initialAP = getCurrentAp(attacker);

      const result = retreat(MOVE_BY_AP, 2.0);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(EventType.ACTOR_DID_MOVE_IN_COMBAT);
      expect(getCurrentAp(attacker)).toBeLessThan(initialAP); // AP consumed
    });

    it('should call declareEvent on context', () => {
      const { retreat, context } = defaultScenario;

      retreat(MOVE_BY_DISTANCE, 5);

      expect(context.declareEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.ACTOR_DID_MOVE_IN_COMBAT,
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
      setCurrentAp(attacker, 0.5); // Very low AP

      const result = retreat(MOVE_BY_DISTANCE, 50); // Would cost significant AP

      expect(result).toHaveLength(0);
      expect(context.declareError).toHaveBeenCalled();
    });

    it('should reject AP exceeding current AP', () => {
      const { retreat, attacker, context } = defaultScenario;
      setCurrentAp(attacker, 3.0);

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
      const event = result[0] as ActorDidMoveInCombat;

      expect(result).toHaveLength(1);
      expect(event).toMatchObject({
        type: EventType.ACTOR_DID_MOVE_IN_COMBAT,
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
      const event = result[0] as ActorDidMoveInCombat;
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
      const event = result[0] as ActorDidMoveInCombat;

      // Event payload should contain whole number coordinates
      expect(Number.isInteger(event.payload.to.coordinate)).toBe(true);
      expect(event.payload.to.coordinate).toBe(Math.round(event.payload.to.coordinate));
    });

    it('should report whole number distance in event payload for AP-based movement', () => {
      const roundingScenario = useCombatMovementTestScenario({
        attackerPosition: 50,
        enemyPosition: 60
      });
      const { retreat } = roundingScenario;

      // AP-based movement uses apToDistance which produces fractional distances
      const result = retreat(MOVE_BY_AP, 1.5);

      expect(result).toHaveLength(1);
      const event = result[0] as ActorDidMoveInCombat;

      // Distance in event should be a whole number (tactical rounding applied)
      expect(Number.isInteger(event.payload.distance)).toBe(true);
      expect(event.payload.distance).toBeGreaterThan(0);
    });

    it('should report actual moved distance matching position change', () => {
      const roundingScenario = useCombatMovementTestScenario({
        attackerPosition: 50,
        enemyPosition: 60
      });
      const { retreat } = roundingScenario;

      const result = retreat(MOVE_BY_DISTANCE, 8);

      expect(result).toHaveLength(1);
      const event = result[0] as ActorDidMoveInCombat;

      // Event distance should match actual movement (from tactical positions)
      const actualMovement = Math.abs(event.payload.to.coordinate - event.payload.from.coordinate);
      expect(event.payload.distance).toBe(actualMovement);
      expect(Number.isInteger(event.payload.distance)).toBe(true);
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
        type: EventType.ACTOR_DID_MOVE_IN_COMBAT,
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

  describe('Auto-Done Functionality', () => {
    it('should not auto-advance turn by default', () => {
      const { retreat } = defaultScenario;

      const result = retreat(MOVE_BY_MAX, 0);

      // Should only generate MOVE event, not turn advancement events
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(EventType.ACTOR_DID_MOVE_IN_COMBAT);
    });

    it('should auto-advance turn when autoDone is true and AP is depleted by MOVE_BY_MAX', () => {
      const mockDone = vi.fn(() => [
        {
          type: EventType.COMBAT_TURN_DID_END,
          actor: 'flux:actor:test-actor' as const,
          location: 'flux:place:test-battlefield' as const,
          payload: {}
        },
        {
          type: EventType.COMBAT_TURN_DID_START,
          actor: 'flux:actor:other-actor' as const,
          location: 'flux:place:test-battlefield' as const,
          payload: {}
        }
      ]) as any;

      // Create retreat method with mock done dependency
      const retreatScenario = useCombatMovementTestScenario({
        retreatDeps: { done: mockDone }
      });

      const result = retreatScenario.retreat(MOVE_BY_MAX, 0, undefined, { autoDone: true });

      // Should generate MOVE event + turn advancement events
      expect(result).toHaveLength(3);
      expect(result[0].type).toBe(EventType.ACTOR_DID_MOVE_IN_COMBAT);
      expect(result[1].type).toBe(EventType.COMBAT_TURN_DID_END);
      expect(result[2].type).toBe(EventType.COMBAT_TURN_DID_START);
      expect(mockDone).toHaveBeenCalledOnce();
    });

    it('should auto-advance turn when AP is depleted by distance-based movement', () => {
      const mockDone = vi.fn(() => [
        {
          type: EventType.COMBAT_TURN_DID_END,
          actor: 'flux:actor:test-actor' as const,
          location: 'flux:place:test-battlefield' as const,
          payload: {}
        }
      ]) as any;

      // Use MOVE_BY_MAX to guarantee AP depletion
      const efficiencyScenario = useCombatMovementTestScenario({
        attackerAP: 3.0, // Limited AP that will be fully consumed
        retreatDeps: { done: mockDone }
      });

      const result = efficiencyScenario.retreat(MOVE_BY_MAX, 0, undefined, { autoDone: true });

      // Should generate MOVE event + turn advancement events due to AP depletion
      expect(result.length).toBeGreaterThan(1);
      expect(result[0].type).toBe(EventType.ACTOR_DID_MOVE_IN_COMBAT);
      expect(result[result.length - 1].type).toBe(EventType.COMBAT_TURN_DID_END);
      expect(mockDone).toHaveBeenCalledOnce();

      // Verify AP is depleted (MOVE_BY_MAX always uses all available AP)
      expect(getCurrentAp(efficiencyScenario.attacker)).toBe(0);
    });

    it('should not auto-advance turn when autoDone is true but AP is not depleted', () => {
      const mockDone = vi.fn(() => []);

      const partialApScenario = useCombatMovementTestScenario({
        attackerAP: 6.0,
        retreatDeps: { done: mockDone }
      });

      const result = partialApScenario.retreat(MOVE_BY_DISTANCE, 3, undefined, { autoDone: true });

      // Should only generate MOVE event since AP is not depleted
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(EventType.ACTOR_DID_MOVE_IN_COMBAT);
      expect(mockDone).not.toHaveBeenCalled();

      // Verify AP is not depleted
      expect(getCurrentAp(partialApScenario.attacker)).toBeGreaterThan(0.1);
    });

    it('should not call done when autoDone is false even if AP is depleted', () => {
      const mockDone = vi.fn(() => []);

      const maxApScenario = useCombatMovementTestScenario({
        retreatDeps: { done: mockDone }
      });

      const result = maxApScenario.retreat(MOVE_BY_MAX, 0, undefined, { autoDone: false });

      // Should only generate MOVE event
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(EventType.ACTOR_DID_MOVE_IN_COMBAT);
      expect(mockDone).not.toHaveBeenCalled();
    });

    it('should propagate trace to done events', () => {
      const customTrace = 'custom-retreat-trace-123';
      const mockDone = vi.fn((trace) => [
        createCombatTurnDidEndEvent((e) => ({
          ...e,
          trace,
          location: DEFAULT_LOCATION,
          payload: {} as any,
        }))
      ]);

      const traceScenario = useCombatMovementTestScenario({
        retreatDeps: { done: mockDone }
      });

      const result = traceScenario.retreat(MOVE_BY_MAX, 0, customTrace, { autoDone: true });

      expect(result.length).toBeGreaterThan(1);
      expect(result[0].trace).toBe(customTrace);
      expect(mockDone).toHaveBeenCalledWith(customTrace);
    });

    it('should not auto-advance when done dependency is not provided', () => {
      // Create scenario without done dependency
      const noDoneScenario = useCombatMovementTestScenario({
        retreatDeps: {} // No done method
      });

      const result = noDoneScenario.retreat(MOVE_BY_MAX, 0, undefined, { autoDone: true });

      // Should only generate MOVE event since done is not available
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(EventType.ACTOR_DID_MOVE_IN_COMBAT);
    });
  });

  describe('Efficiency Verification', () => {
    it('should move reduced distance due to 35% efficiency penalty (backward movement)', () => {
      const { retreat, attacker } = defaultScenario;
      const initialPosition = attacker.position.coordinate;
      const testAP = 3.0;

      const result = retreat(MOVE_BY_AP, testAP);

      expect(result).toHaveLength(1);
      const event = result[0] as ActorDidMoveInCombat;
      const actualDistance = Math.abs(event.payload.to.coordinate - initialPosition);

      // RETREAT should move less distance than ADVANCE would with same AP due to efficiency penalty
      expect(actualDistance).toBeGreaterThan(0);
      expect(event.payload.cost.ap).toBe(testAP);
      expect(event.payload.direction).toBe(MovementDirection.BACKWARD);
    });

    it('should require more AP to cover same distance as advance', () => {
      const { retreat, attacker } = defaultScenario;
      const initialAP = getCurrentAp(attacker);
      const testDistance = 10; // Fixed distance

      const result = retreat(MOVE_BY_DISTANCE, testDistance);

      expect(result).toHaveLength(1);
      const event = result[0] as ActorDidMoveInCombat;

      // Should cost more AP than advance would for same distance due to efficiency penalty
      expect(event.payload.cost.ap).toBeGreaterThan(testDistance * 0.18); // Base cost would be ~1.8 AP for 10m
      expect(event.payload.distance).toBe(testDistance);
      expect(event.payload.direction).toBe(MovementDirection.BACKWARD);

      // Should have consumed more AP than the base movement cost
      expect(getCurrentAp(attacker)).toBeLessThan(initialAP);
    });

    it('should use all available AP for max movement but cover less distance than advance', () => {
      const { retreat, attacker } = defaultScenario;
      const initialAP = getCurrentAp(attacker);

      const result = retreat(MOVE_BY_MAX, 0);

      expect(result).toHaveLength(1);
      const event = result[0] as ActorDidMoveInCombat;

      // Should use all available AP (same as advance)
      expect(event.payload.cost.ap).toBe(initialAP);
      expect(getCurrentAp(attacker)).toBe(0);

      // Should move some distance backward, but less than advance would
      expect(event.payload.distance).toBeGreaterThan(0);
      expect(event.payload.direction).toBe(MovementDirection.BACKWARD);
    });

    it('should demonstrate efficiency penalty with direct comparison', () => {
      // Create two identical scenarios for comparison
      const advanceScenario = useCombatMovementTestScenario({
        attackerAP: 4.0,
        attackerPosition: 100,
      });
      const retreatScenario = useCombatMovementTestScenario({
        attackerAP: 4.0,
        attackerPosition: 100,
      });

      // Same AP amount for both
      const testAP = 3.0;
      const advanceResult = advanceScenario.advance(MOVE_BY_AP, testAP);
      const retreatResult = retreatScenario.retreat(MOVE_BY_AP, testAP);

      expect(advanceResult).toHaveLength(1);
      expect(retreatResult).toHaveLength(1);

      const advanceEvent = advanceResult[0] as ActorDidMoveInCombat;
      const retreatEvent = retreatResult[0] as ActorDidMoveInCombat;

      // Both should use same AP
      expect(advanceEvent.payload.cost.ap).toBe(testAP);
      expect(retreatEvent.payload.cost.ap).toBe(testAP);

      // Retreat should cover less distance than advance
      expect(retreatEvent.payload.distance).toBeLessThan(advanceEvent.payload.distance);

      // Verify directions
      expect(advanceEvent.payload.direction).toBe(MovementDirection.FORWARD);
      expect(retreatEvent.payload.direction).toBe(MovementDirection.BACKWARD);
    });
  });
});
