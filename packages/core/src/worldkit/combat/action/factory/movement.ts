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
import { ActorDidMoveInCombat, EventType, WorldEvent } from '~/types/event';
import { createWorldEvent } from '~/worldkit/event';
import { calculateTacticalMovement, roundApCostUp } from '~/worldkit/combat/tactical-rounding';
import { distanceToAp, apToDistance } from '~/worldkit/physics/movement';
import { checkMovementCollision } from '~/worldkit/combat/movement';
import { deductAp, MOVE_BY_DISTANCE, MOVE_BY_MAX, MOVE_BY_AP, MovementType } from '~/worldkit/combat/combatant';
import { getStatValue } from '~/worldkit/entity/actor/stats';
import { MovementActionDependencies, DEFAULT_MOVEMENT_DEPS } from '../movement-deps';
import { createMovementCostFromAp, createMovementCostFromDistance, createMaxMovementCost } from '~/worldkit/combat/tactical-cost';
import { ActorURN } from '~/types/taxonomy';
import { MovementDirection } from '~/types/combat';
import { DoneMethod } from '../done';
import { cleanApPrecision } from '~/worldkit/combat/ap';

export type MovementEfficiencyProfile = {
  forward: number;   // Efficiency coefficient for forward movement (1.0 = 100%)
  backward: number;  // Efficiency coefficient for backward movement (0.0-1.0, lower = less efficient)
};

export const DEFAULT_EFFICIENCY_PROFILE: MovementEfficiencyProfile = {
  forward: 1.0, // 100% efficiency
  backward: 0.5, // 50% efficiency (half as efficient as forward movement)
};

export type MovementOptions = {
  autoDone?: boolean;
};

export type MovementMethod = (by: MovementType, value: number, trace?: string, options?: MovementOptions) => WorldEvent[];

export type MovementFactoryDependencies = MovementActionDependencies & {
  efficiencyProfile?: MovementEfficiencyProfile;
  done?: DoneMethod;
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

  // Higher finesse slightly improves backward movement efficiency (better body control)
  const finesseBonus = (finesse - 50) * 0.002; // ±0.1 efficiency per 50 finesse points
  const adjustedBackwardEfficiency = Math.min(0.8, Math.max(0.3, efficiencyProfile.backward + finesseBonus));

  return adjustedBackwardEfficiency;
}

/**
 * Movement calculation result
 */
interface MovementParameters {
  distance: number;
  ap: number;
}


/**
 * Calculate distance-based movement parameters
 */
function calculateDistanceMovement(
  value: number,
  power: number,
  finesse: number,
  actorMassKg: number,
  efficiencyMultiplier: number,
  distanceToApImpl: typeof distanceToAp
): MovementParameters {
  const distance = Number.isInteger(value) ? value : Math.ceil(value);
  // AP cost is always calculated from the requested distance - efficiency doesn't affect AP cost
  const ap = distanceToApImpl(power, finesse, distance, actorMassKg);

  return { distance, ap };
}

/**
 * Calculate AP-based movement parameters
 */
function calculateApMovement(
  value: number,
  power: number,
  finesse: number,
  actorMassKg: number,
  combatant: Combatant,
  efficiencyMultiplier: number,
  apToDistanceImpl: typeof apToDistance,
  roundApCostUp: (ap: number) => number,
  declareError: (message: string, trace: string) => void,
  trace: string
): MovementParameters | null {
  const ap = roundApCostUp(value);

  // Check AP availability first
  if (ap > combatant.ap.eff.cur) {
    declareError(
      `${ap} AP would exceed your remaining AP (${combatant.ap.eff.cur} AP)`,
      trace
    );
    return null;
  }

  // Efficiency affects how much distance you get for the same AP
  // Lower efficiency coefficient = less distance for same AP (less efficient)
  const baseDistance = apToDistanceImpl(power, finesse, ap, actorMassKg);
  const distance = baseDistance * efficiencyMultiplier;

  return { distance, ap };
}

/**
 * Calculate movement parameters based on movement type
 */
function calculateMovementParameters(
  by: MovementType,
  value: number,
  power: number,
  finesse: number,
  actorMassKg: number,
  currentPosition: number,
  direction: number,
  combatant: Combatant,
  session: CombatSession,
  combatants: Map<ActorURN, Combatant>,
  actor: Actor,
  efficiencyMultiplier: number,
  distanceToApImpl: typeof distanceToAp,
  apToDistanceImpl: typeof apToDistance,
  roundApCostUp: typeof import('~/worldkit/combat/tactical-rounding').roundApCostUp,
  checkMovementCollision: typeof import('~/worldkit/combat/movement').checkMovementCollision,
  declareError: (message: string, trace: string) => void,
  trace: string
): MovementParameters | null {
  switch (by) {
    case MOVE_BY_MAX:
      // For max movement: compute max possible distance, clamp by collisions, then calculate cost
      const availableAp = combatant.ap.eff.cur;

      // Check for zero AP upfront
      if (availableAp <= 0) {
        declareError('No movement possible', trace);
        return null;
      }

      // 1. Compute the maximum possible distance the actor *could* move
      const battlefield = session.data.battlefield;
      const maxBoundaryDistance = direction > 0
        ? battlefield.length - currentPosition
        : currentPosition;

      // 2. Check for collisions and clamp distance to the nearest collider
      const maxTestPosition = currentPosition + (direction * maxBoundaryDistance);
      const collisionResult = checkMovementCollision(combatants, actor.id, currentPosition, maxTestPosition);

      let maxDistance = maxBoundaryDistance;
      if (!collisionResult.success && collisionResult.finalPosition !== undefined) {
        const collisionDistance = Math.abs(collisionResult.finalPosition - currentPosition);
        maxDistance = Math.min(maxDistance, collisionDistance);
      }

      // If no movement is possible, return zero movement (no error for max movement)
      if (maxDistance <= 0) {
        return { distance: 0, ap: 0 };
      }

      // 3. Compute cost from the clamped distance
      const costResult = calculateDistanceMovement(
        maxDistance,
        power,
        finesse,
        actorMassKg,
        efficiencyMultiplier,
        distanceToApImpl
      );

      // Check if we can afford this movement
      if (costResult.ap > availableAp) {
        // If we can't afford the full distance, find the max distance we can afford
        // For max movement, use all available AP and calculate the distance we can achieve
        const baseDistance = apToDistanceImpl(power, finesse, availableAp, actorMassKg);
        const affordableDistance = baseDistance * efficiencyMultiplier;

        if (affordableDistance <= 0) {
          declareError('No movement possible', trace);
          return null;
        }

        return { distance: affordableDistance, ap: availableAp };
      }

      return costResult;

    case MOVE_BY_DISTANCE:
      return calculateDistanceMovement(
        value,
        power,
        finesse,
        actorMassKg,
        efficiencyMultiplier,
        distanceToApImpl
      );

    case MOVE_BY_AP:
      return calculateApMovement(
        value,
        power,
        finesse,
        actorMassKg,
        combatant,
        efficiencyMultiplier,
        apToDistanceImpl,
        roundApCostUp,
        declareError,
        trace
      );

    default:
      declareError(`Unknown movement type: ${by}`, trace);
      return null;
  }
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
    done,
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
    options?: MovementOptions,
  ): WorldEvent[] {
    const { autoDone = false } = options ?? {};
    // Input validation
    if (by !== MOVE_BY_MAX && value <= 0) {
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

    // Calculate movement parameters based on movement type
    const movementParams = calculateMovementParameters(
      by,
      value,
      power,
      finesse,
      actorMassKg,
      currentPosition,
      direction,
      combatant,
      session,
      combatants,
      actor,
      efficiencyMultiplier,
      distanceToApImpl,
      apToDistanceImpl,
      roundApCostUp,
      checkMovementCollision,
      declareError,
      trace
    );

    if (!movementParams) {
      return []; // Error already declared in calculateMovementParameters
    }

    const { distance, ap } = movementParams;

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

    // Check collisions (skip for max movement since we already handled it)
    if (by !== MOVE_BY_MAX) {
      const collisionResult = checkMovementCollision(combatants, actor.id, currentPosition, precisePosition);
      if (!collisionResult.success) {
        declareError(collisionResult.error || 'Movement blocked by collision', trace);
        return [];
      }
    }

    // Calculate tactical movement for position rounding
    // For AP-based movement, use the efficiency-adjusted distance instead of raw AP
    // to ensure tactical rounding respects efficiency calculations
    const mockInput = by === MOVE_BY_DISTANCE || by === MOVE_BY_MAX
      ? { type: 'distance' as const, distance }
      : { type: 'distance' as const, distance }; // Use efficiency-adjusted distance for AP-based movement too

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


    // Calculate cost using tactical cost factories (following established pattern)
    const baseCost = by === MOVE_BY_MAX
      ? createMaxMovementCost(combatant.ap.eff.cur, power, finesse, distance, actorMassKg)
      : by === MOVE_BY_DISTANCE
        ? createMovementCostFromDistanceImpl(power, finesse, distance, actorMassKg)
        : createMovementCostFromApImpl(ap, power, finesse, actorMassKg);

    // Calculate final cost
    // Efficiency multiplier is already applied in the movement parameter calculations
    const finalCost = {
      ap: by === MOVE_BY_MAX ? baseCost.ap : roundApCostUp(baseCost.ap),
      energy: baseCost.energy * efficiencyMultiplier,
    };


    // For max movement, we should have already ensured this is affordable
    // For other movements, check affordability against the final cost
    if (by !== MOVE_BY_MAX && finalCost.ap > combatant.ap.eff.cur) {
      const baseMaxDistance = apToDistanceImpl(power, finesse, combatant.ap.eff.cur, actorMassKg);
      const maxDistance = baseMaxDistance * efficiencyMultiplier;
      declareError(
        `Movement would cost ${finalCost.ap} AP (you have ${combatant.ap.eff.cur} AP). Try: ${actionName.toLowerCase()} distance ${Math.floor(maxDistance)}m`,
        trace
      );
      return [];
    }

    // Execute movement using tactical values
    const originalPosition = combatant.position.coordinate;
    const originalFacing = combatant.position.facing;

    combatant.position.coordinate = movementResult.tactical.position;
    // Deduct the final cost (following established pattern)
    deductAp(combatant, finalCost.ap);

    // Create movement event
    const from = { coordinate: originalPosition, facing: originalFacing, speed: combatant.position.speed };
    const to = { coordinate: combatant.position.coordinate, facing: combatant.position.facing, speed: combatant.position.speed };

    // Calculate actual tactical distance moved (always a whole number due to tactical rounding)
    const actualDistance = Math.abs(movementResult.tactical.position - originalPosition);

    const event: ActorDidMoveInCombat = createWorldEventImpl({
      trace: trace,
      type: EventType.ACTOR_DID_MOVE_IN_COMBAT,
      actor: actor.id,
      location: actor.location,
      session: session.id,
      payload: {
        from,
        to,
        distance: actualDistance,
        direction: movementDirection,
        cost: finalCost
      },
    });

    context.declareEvent(event);
    const events: WorldEvent[] = [event];

    // Check for auto-done after AP deduction
    // Only auto-advance turn if actor cannot perform any meaningful actions
    // Use same threshold as AI system: 0.1 AP is the minimum for meaningful actions
    const remainingAp = cleanApPrecision(combatant.ap.eff.cur);
    const canStillAct = remainingAp > 0.1;

    if (!canStillAct && autoDone && done) {
      const doneEvents = done(trace);
      events.push(...doneEvents);
    }

    return events;
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
