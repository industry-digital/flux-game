/**
 * Unified Movement Factory
 *
 * Creates both ADVANCE and RETREAT methods using a single implementation.
 * The only difference is the movement direction relative to CombatFacing.
 *
 * Key insights:
 * - ADVANCE: moves in facing direction (WITH_FACING)
 * - RETREAT: moves opposite to facing direction (AGAINST_FACING)
 * - Retreat is less efficient than advance (biomechanical reality)
 */

import { Actor, Stat } from '~/types/entity/actor';
import { Combatant, CombatSession } from '~/types/combat';
import { TransformerContext } from '~/types/handler';
import { EventType, WorldEvent } from '~/types/event';
import { createWorldEvent } from '~/worldkit/event';
import { calculateTacticalMovement, roundApCostUp } from '~/worldkit/combat/tactical-rounding';
import { distanceToAp, apToDistance } from '~/worldkit/physics/movement';
import { checkMovementCollision } from '~/worldkit/combat/movement';
import { deductAp, MOVE_BY_DISTANCE, MovementType } from '~/worldkit/combat/combatant';
import { getStatValue } from '~/worldkit/entity/actor/stats';
import { MovementActionDependencies, DEFAULT_MOVEMENT_DEPS } from '../movement-deps';
import { createMovementCostFromAp, createMovementCostFromDistance } from '~/worldkit/combat/tactical-cost';

// Not to be confused with CombatFacing
export enum MovementDirection {
  FORWARD = 1,    // Move in facing direction (ADVANCE)
  BACKWARD = -1 // Move opposite to facing (RETREAT)
}

export type MovementEfficiencyProfile = {
  forward: number;   // Efficiency multiplier for forward movement (1.0 = 100%)
  backward: number;  // Efficiency multiplier for backward movement (>1.0 = penalty)
};

export const DEFAULT_EFFICIENCY_PROFILE: MovementEfficiencyProfile = {
  forward: 1.0,   // 100% efficiency
  backward: 1.35, // 35% penalty for backward movement
};

export type MovementMethod = (by: MovementType, value: number, trace?: string) => WorldEvent[];

export type MovementFactoryDependencies = MovementActionDependencies & {
  efficiencyProfile?: MovementEfficiencyProfile;
};

/**
 * Calculate movement efficiency based on direction and actor stats
 */
function calculateMovementEfficiency(
  movementDirection: MovementDirection,
  actor: Actor,
  efficiencyProfile: MovementEfficiencyProfile = DEFAULT_EFFICIENCY_PROFILE,
): number {
  if (movementDirection === MovementDirection.FORWARD) {
    return efficiencyProfile.forward;
  }

  // Backward movement penalty - could be enhanced with stat-based modifiers
  const finesse = getStatValue(actor, Stat.FIN);

  // Higher finesse slightly reduces backward movement penalty (better body control)
  const finesseBonus = (finesse - 50) * 0.002; // ±0.1 efficiency per 50 finesse points
  const adjustedBackwardEfficiency = Math.max(1.1, efficiencyProfile.backward - finesseBonus);

  return adjustedBackwardEfficiency;
}

/**
 * Unified movement method factory
 *
 * Creates movement methods for both ADVANCE and RETREAT using the same core logic.
 * Direction and efficiency are the only differences between the two.
 */
export function createMovementMethod(
  context: TransformerContext,
  session: CombatSession,
  actor: Actor,
  combatant: Combatant,
  movementDirection: MovementDirection,
  deps: MovementFactoryDependencies = { ...DEFAULT_MOVEMENT_DEPS, efficiencyProfile: DEFAULT_EFFICIENCY_PROFILE },
): MovementMethod {
  const { computeActorMass } = context.mass;
  const { combatants } = session.data;

  const {
    createWorldEvent: createWorldEventImpl = createWorldEvent,
    distanceToAp: distanceToApImpl = distanceToAp,
    apToDistance: apToDistanceImpl = apToDistance,
    calculateTacticalMovement: calculateTacticalMovementImpl = calculateTacticalMovement,
    createMovementCostFromDistance: createMovementCostFromDistanceImpl = createMovementCostFromDistance,
    createMovementCostFromAp: createMovementCostFromApImpl = createMovementCostFromAp,
    efficiencyProfile = DEFAULT_EFFICIENCY_PROFILE,
  } = deps;

  // Calculate efficiency multiplier for this movement direction
  const efficiencyMultiplier = calculateMovementEfficiency(movementDirection, actor, efficiencyProfile);

  // Determine action name for error messages
  const actionName = movementDirection === MovementDirection.FORWARD ? 'Advance' : 'Retreat';

  function declareError(message: string, trace: string): void {
    context.declareError(`${actionName}: ${message}`, trace);
  }

  return function move(
    by: MovementType,
    value: number,
    trace: string = context.uniqid(),
  ): WorldEvent[] {
    // Input validation
    if (value <= 0) {
      declareError(`${by === MOVE_BY_DISTANCE ? 'Distance' : 'AP'} must be positive`, trace);
      return [];
    }

    if (!combatants.has(actor.id)) {
      declareError('Actor not in combat', trace);
      return [];
    }

    // Calculate actor's actual mass (body + equipment + inventory)
    const actorMassGrams = computeActorMass(actor);
    const actorMassKg = actorMassGrams / 1000;
    const power = getStatValue(actor, Stat.POW);
    const finesse = getStatValue(actor, Stat.FIN);
    const currentPosition = combatant.position.coordinate;

    // Calculate movement direction: movementDirection * facing
    // Examples:
    // - ADVANCE (1) + RIGHT (1) = 1 (rightward)
    // - ADVANCE (1) + LEFT (-1) = -1 (leftward)
    // - RETREAT (-1) + RIGHT (1) = -1 (leftward)
    // - RETREAT (-1) + LEFT (-1) = 1 (rightward)
    const direction = movementDirection * (combatant.position.facing as number);

    let distance: number;
    let ap: number;

    if (by === MOVE_BY_DISTANCE) {
      // Moving by distance: apply efficiency penalty to AP cost
      distance = Number.isInteger(value) ? value : Math.ceil(value);
      const baseApCost = distanceToApImpl(power, finesse, distance, actorMassKg);
      ap = baseApCost * efficiencyMultiplier;
    } else {
      // Moving by AP: efficiency affects distance covered
      ap = roundApCostUp(value);

      // Check AP availability first
      if (ap > combatant.ap.eff.cur) {
        declareError(
          `${ap} AP would exceed your remaining AP (${combatant.ap.eff.cur} AP)`,
          trace
        );
        return [];
      }

      // For backward movement, same AP covers less distance
      const baseDistance = apToDistanceImpl(power, finesse, ap, actorMassKg);
      distance = baseDistance / efficiencyMultiplier;
    }

    // Calculate final position
    const precisePosition = currentPosition + (direction * distance);

    // Check battlefield boundaries
    const battlefield = session.data.battlefield;
    if (precisePosition < 0 || precisePosition > battlefield.length) {
      const maxDistance = direction > 0
        ? battlefield.length - currentPosition
        : currentPosition;
      declareError(
        `Movement would exceed battlefield boundary. Maximum ${actionName.toLowerCase()}: ${maxDistance}m`,
        trace
      );
      return [];
    }

    // Check collisions
    const collisionResult = checkMovementCollision(combatants, actor.id, currentPosition, precisePosition);
    if (!collisionResult.success) {
      declareError(collisionResult.error || 'Movement blocked by collision', trace);
      return [];
    }

    // Calculate tactical movement for position rounding
    const mockInput = by === MOVE_BY_DISTANCE
      ? { type: 'distance' as const, distance }
      : { type: 'ap' as const, ap };

    const movementResult = calculateTacticalMovementImpl(
      power,
      finesse,
      mockInput,
      actorMassKg,
      currentPosition,
      direction as 1 | -1,
      distanceToApImpl,
      apToDistanceImpl
    );

    // Validate final AP cost
    const tacticalAp = movementResult.tactical.apCost;
    if (tacticalAp > combatant.ap.eff.cur) {
      const maxDistance = apToDistanceImpl(power, finesse, combatant.ap.eff.cur, actorMassKg) / efficiencyMultiplier;
      declareError(
        `Movement would cost ${tacticalAp} AP (you have ${combatant.ap.eff.cur} AP). Try: ${actionName.toLowerCase()} distance ${Math.floor(maxDistance)}m`,
        trace
      );
      return [];
    }

    // Calculate cost with efficiency applied
    const cost = by === MOVE_BY_DISTANCE
      ? createMovementCostFromDistanceImpl(power, finesse, distance, actorMassKg)
      : createMovementCostFromApImpl(ap, power, finesse, actorMassKg);

    // Apply efficiency to final cost
    const adjustedCost = {
      ap: cost.ap * efficiencyMultiplier,
      energy: cost.energy * efficiencyMultiplier,
    };

    // Execute movement using tactical values
    const originalPosition = combatant.position.coordinate;
    const originalFacing = combatant.position.facing;

    combatant.position.coordinate = movementResult.tactical.position;
    deductAp(combatant, tacticalAp);

    // Create movement event
    const from = { coordinate: originalPosition, facing: originalFacing, speed: combatant.position.speed };
    const to = { coordinate: combatant.position.coordinate, facing: combatant.position.facing, speed: combatant.position.speed };
    const payload = { actor: actor.id, from, to, distance, cost: adjustedCost };

    const event = createWorldEventImpl({
      id: context.uniqid(),
      ts: context.timestamp(),
      type: EventType.COMBATANT_DID_MOVE,
      actor: actor.id,
      location: actor.location,
      trace: trace,
      payload,
    });

    context.declareEvent(event);
    return [event];
  };
}

/**
 * Factory function for ADVANCE method
 */
export function createAdvanceMethod(
  context: TransformerContext,
  session: CombatSession,
  actor: Actor,
  combatant: Combatant,
  deps?: MovementFactoryDependencies,
): MovementMethod {
  return createMovementMethod(context, session, actor, combatant, MovementDirection.FORWARD, deps);
}

/**
 * Factory function for RETREAT method
 */
export function createRetreatMethod(
  context: TransformerContext,
  session: CombatSession,
  actor: Actor,
  combatant: Combatant,
  deps?: MovementFactoryDependencies,
): MovementMethod {
  return createMovementMethod(context, session, actor, combatant, MovementDirection.BACKWARD, deps);
}
