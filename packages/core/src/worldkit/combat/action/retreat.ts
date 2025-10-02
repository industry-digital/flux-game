/**
 * RETREAT Action Implementation
 *
 * Handles backward movement with defensive intent - away from threats, creating space, tactical withdrawal.
 * Mirrors advance.ts but with reversed movement direction.
 */

import { Actor } from '~/types/entity/actor';
import { Combatant, CombatFacing, CombatSession } from '~/types/combat';
import { EventType, WorldEvent } from '~/types/event';
import { createWorldEvent } from '~/worldkit/event';
import { distanceToAp, apToDistance } from '~/worldkit/physics/movement';
import { deductAp, MOVE_BY_DISTANCE, MovementType } from '~/worldkit/combat/combatant';
import { calculateTacticalMovement, roundPosition } from '~/worldkit/combat/tactical-rounding';
import { checkMovementCollision } from '~/worldkit/combat/movement';
import { TransformerContext } from '~/types/handler';
import { ActorURN } from '~/types/taxonomy';
import { MovementActionDependencies, DEFAULT_MOVEMENT_DEPS } from './movement-deps';
import { createMovementCostFromDistance, createMovementCostFromAp } from '~/worldkit/combat/tactical-cost';

export type RetreatDependencies = MovementActionDependencies;
export const DEFAULT_RETREAT_DEPS = DEFAULT_MOVEMENT_DEPS;

export type RetreatMethod = (by: MovementType, value: number, target?: ActorURN, trace?: string) => WorldEvent[];

export function createRetreatMethod(
  context: TransformerContext,
  session: CombatSession,
  actor: Actor,
  combatant: Combatant,
  deps: RetreatDependencies = DEFAULT_RETREAT_DEPS,
): RetreatMethod {
  const { computeActorMass } = context.mass;
  const {
    createWorldEvent: createWorldEventImpl = createWorldEvent,
    distanceToAp: distanceToApImpl = distanceToAp,
    apToDistance: apToDistanceImpl = apToDistance,
    calculateTacticalMovement: calculateTacticalMovementImpl = calculateTacticalMovement,
    roundPosition: roundPositionImpl = roundPosition,
    createMovementCostFromDistance: createMovementCostFromDistanceImpl = createMovementCostFromDistance,
    createMovementCostFromAp: createMovementCostFromApImpl = createMovementCostFromAp,
  } = deps;

  function retreat(by: MovementType, value: number, target?: ActorURN, trace: string = context.uniqid()): WorldEvent[] {
    // Input validation
    if (value <= 0) {
      context.declareError(`${by === MOVE_BY_DISTANCE ? 'Distance' : 'AP'} must be positive`, trace);
      return [];
    }

    const combatants = session.data.combatants;
    if (!combatants.has(actor.id)) {
      context.declareError('You are not in combat.', trace);
      return [];
    }

    // Calculate actor's actual mass (body + equipment + inventory)
    const actorMassGrams = computeActorMass(actor);
    const actorMassKg = actorMassGrams / 1000;

    // Get actor stats
    const power = actor.stats.pow.eff;
    const finesse = actor.stats.fin.eff;
    const currentPosition = combatant.position.coordinate;

    // Calculate retreat direction (opposite of current facing)
    const direction = combatant.position.facing === CombatFacing.RIGHT ? -1 : 1;

    // Create mock input for tactical movement calculations (maintains compatibility)
    const mockInput = by === MOVE_BY_DISTANCE
      ? { type: 'distance' as const, distance: value, target }
      : { type: 'ap' as const, ap: value, target };

    // Calculate precise values using primitive parameters
    let preciseValues;
    if (by === MOVE_BY_DISTANCE) {
      const preciseAp = distanceToApImpl(power, finesse, value, actorMassKg);
      const precisePosition = currentPosition + (direction * value);
      preciseValues = {
        distance: value,
        finalPosition: precisePosition,
        ap: preciseAp
      };
    } else {
      const preciseDistance = apToDistanceImpl(power, finesse, value, actorMassKg);
      const precisePosition = currentPosition + (direction * preciseDistance);
      preciseValues = {
        distance: preciseDistance,
        finalPosition: precisePosition,
        ap: value
      };
    }


    // Check battlefield boundaries using precise position
    const battlefield = session.data.battlefield;
    if (preciseValues.finalPosition < 0 || preciseValues.finalPosition > battlefield.length) {
      const maxRetreat = combatant.position.facing === CombatFacing.RIGHT
        ? currentPosition  // Can retreat to 0
        : battlefield.length - currentPosition; // Can retreat to battlefield end

      context.declareError(
        `Retreat would exceed battlefield boundary. Maximum retreat: ${maxRetreat}m`,
        trace
      );
      return [];
    }

    // Check collisions using precise position (enemies can block retreat)
    const collisionResult = checkMovementCollision(combatants, actor.id, currentPosition, preciseValues.finalPosition);
    if (!collisionResult.success) {
      context.declareError(collisionResult.error || 'Retreat blocked by collision', trace);
      return [];
    }

    // Check AP availability using precise AP cost
    if (combatant.ap.eff.cur < preciseValues.ap) {
      context.declareError(
        `Insufficient AP: retreat would cost ${preciseValues.ap.toFixed(2)} AP but you have ${combatant.ap.eff.cur.toFixed(2)} AP`,
        trace
      );
      return [];
    }

    // Calculate tactical movement values using mock input
    const movementResult = calculateTacticalMovementImpl(
      power,
      finesse,
      mockInput,
      actorMassKg,
      currentPosition,
      direction,
      distanceToApImpl,
      apToDistanceImpl
    );

    // Calculate energy cost for the movement
    //const energyCost = calculateMovementEnergyCost(power, finesse, preciseValues.distance, actorMassKg);
    const cost = createMovementCostFromDistanceImpl(power, finesse, preciseValues.distance, actorMassKg);

    // Update combatant state using tactical values
    const tacticalFinalPosition = roundPositionImpl(movementResult.tactical.position);
    combatant.position.coordinate = tacticalFinalPosition;
    deductAp(combatant, movementResult.tactical.apCost);

    const from = { coordinate: currentPosition, facing: combatant.position.facing, velocity: combatant.position.speed };
    const to = { coordinate: tacticalFinalPosition, facing: combatant.position.facing, velocity: combatant.position.speed };
    const payload = { actor: actor.id,  cost, from, to };

    // Create movement event with both tactical and precise values
    const event = createWorldEventImpl({
      type: EventType.COMBATANT_DID_MOVE,
      location: actor.location,
      trace: trace,
      payload,
    });

    context.declareEvent(event);
    return [event];
  };

  return retreat;
}
