import { Actor } from '~/types/entity/actor';
import { Combatant, CombatFacing, CombatSession } from '~/types/combat';
import { TransformerContext } from '~/types/handler';
import { EventType, WorldEvent } from '~/types/event';
import { ActorURN } from '~/types/taxonomy';
import { createWorldEvent } from '~/worldkit/event';
import { calculateTacticalMovement } from '~/worldkit/combat/tactical-rounding';
import { distanceToAp, apToDistance } from '~/worldkit/physics/movement';
import { createTargetResolver, createCollisionDetector } from '~/worldkit/combat/movement';
import { deductAp, MOVE_BY_DISTANCE, MovementType } from '~/worldkit/combat/combatant';
import { calculateMovementEnergyCost } from '~/worldkit/combat/energy-costs';
import { MovementActionDependencies, DEFAULT_MOVEMENT_DEPS } from './movement-deps';
import { renderMovementNarrative } from '~/worldkit/narrative/combat/movement-narrative';

export type AdvanceDependencies = MovementActionDependencies;
export const DEFAULT_ADVANCE_DEPS = DEFAULT_MOVEMENT_DEPS;

export type AdvanceMethod = (by: MovementType, value: number, target?: ActorURN, trace?: string, dryRun?: boolean) => WorldEvent[];

const PREALLOCATED_MOVE_BY_DISTANCE_INPUT = {
  type: 'distance' as const,
  distance: 0,
  target: undefined,
};

const PREALLOCATED_MOVE_BY_AP_INPUT = {
  type: 'ap' as const,
  ap: 0,
  target: undefined,
};

const getPreallocatedMovementInput = (by: MovementType, distance: number, ap: number) => {
  if (by === MOVE_BY_DISTANCE) {
    PREALLOCATED_MOVE_BY_DISTANCE_INPUT.distance = distance;
    return PREALLOCATED_MOVE_BY_DISTANCE_INPUT;
  }

  PREALLOCATED_MOVE_BY_AP_INPUT.ap = ap;
  return PREALLOCATED_MOVE_BY_AP_INPUT;
};

/**
 * Creates advance method with explicit primitive parameters for zero-allocation performance
 */
export function createAdvanceMethod(
  context: TransformerContext,
  session: CombatSession,
  actor: Actor,
  combatant: Combatant,
  deps: AdvanceDependencies = DEFAULT_ADVANCE_DEPS,
): AdvanceMethod {
  const { declareError } = context;
  const { computeActorMass } = context.mass;
  const { combatants } = session.data;

  const {
    createWorldEvent: createWorldEventImpl = createWorldEvent,
    distanceToAp: distanceToApImpl = distanceToAp,
    apToDistance: apToDistanceImpl = apToDistance,
    calculateTacticalMovement: calculateTacticalMovementImpl = calculateTacticalMovement,
  } = deps;

  // Create movement logic factories
  const resolveTarget = createTargetResolver(combatants, actor, combatant);

  // Use pre-computed collision detector from session (performance optimization)
  // Fallback to creating detector on-demand for test compatibility
  const checkCollisions = session.data.collisionDetectors?.get(actor.id) ||
    createCollisionDetector(session.data.combatants, actor, combatant);

  /**
   * Advance with explicit primitive parameters - zero allocation hot path
   */
  return function advance(
    by: MovementType,
    value: number,
    target?: ActorURN,
    trace: string = context.uniqid(),
    dryRun: boolean = false,
  ): WorldEvent[] {
    // Validate input parameters
    if (value <= 0) {
      declareError(`${by === MOVE_BY_DISTANCE ? 'Distance' : 'AP'} must be positive`, trace);
      return [];
    }

    // Calculate actor's actual mass (body + equipment + inventory)
    const actorMassGrams = computeActorMass(actor);
    const actorMassKg = actorMassGrams / 1000;
    const power = actor.stats.pow.eff;
    const finesse = actor.stats.fin.eff;

    let distance: number;
    let ap: number;

    if (by === MOVE_BY_DISTANCE) {
      // Round fractional distances up to nearest meter
      distance = Number.isInteger(value) ? value : Math.ceil(value);
      ap = distanceToApImpl(power, finesse, distance, actorMassKg);
    } else {
      // Pre-round AP input to nearest 0.1
      ap = Math.ceil(value * 10) / 10;

      if (ap > combatant.ap.eff.cur) {
        declareError(
          `${ap} AP would exceed your remaining AP (${combatant.ap.eff.cur} AP)`,
          trace
        );
        return [];
      }

      distance = apToDistanceImpl(power, finesse, ap, actorMassKg);
    }

    // Resolve target and determine movement direction
    const targetResult = resolveTarget(target);
    if (!targetResult.success) {
      declareError(targetResult.error, trace);
      return [];
    }

    const { targetPosition, shouldTurn } = targetResult;
    const currentPosition = combatant.position.coordinate;
    const direction = targetPosition > currentPosition ? 1 : -1;
    const precisePosition = currentPosition + (direction * distance);


    const input = getPreallocatedMovementInput(by, distance, ap);

    const movementResult = calculateTacticalMovementImpl(
      power,
      finesse,
      input,
      actorMassKg,
      currentPosition,
      direction,
      distanceToApImpl,
      apToDistanceImpl
    );

    // Check boundaries using precise position
    const battlefield = session.data.battlefield;
    if (precisePosition < 0 || precisePosition > battlefield.length) {
      const maxDistance = direction > 0
        ? battlefield.length - currentPosition
        : currentPosition;
      declareError(
        `Movement would exceed battlefield boundary. Maximum advance: ${maxDistance}m`,
        trace
      );
      return [];
    }

    // Check collisions using precise position
    const collisionResult = checkCollisions(currentPosition, precisePosition);
    if (!collisionResult.success) {
      declareError(collisionResult.error || 'Movement blocked by collision', trace);
      return [];
    }

    // Validate AP cost using tactical (rounded up) value
    const tacticalAp = movementResult.tactical.apCost;
    if (tacticalAp > combatant.ap.eff.cur) {
      const maxDistance = apToDistanceImpl(power, finesse, combatant.ap.eff.cur, actorMassKg);
      declareError(
        `Movement would cost ${tacticalAp} AP (you have ${combatant.ap.eff.cur} AP). Try: advance distance ${Math.floor(maxDistance)}m`,
        trace
      );
      return [];
    }

    // Calculate energy cost for the movement
    const energyCost = calculateMovementEnergyCost(power, finesse, distance, actorMassKg);
    const cost = { ap: tacticalAp, energy: energyCost };

    // Execute movement using tactical values
    const originalPosition = combatant.position.coordinate;
    const originalFacing = combatant.position.facing;

    // Use tactical values for actual gameplay state
    combatant.position.coordinate = movementResult.tactical.position;
    deductAp(combatant, movementResult.tactical.apCost);

    // Handle facing changes
    if (shouldTurn) {
      combatant.position.facing = targetPosition > currentPosition ? CombatFacing.RIGHT : CombatFacing.LEFT;
    }

    const from = { coordinate: originalPosition, facing: originalFacing, velocity: combatant.position.speed };
    const to = { coordinate: combatant.position.coordinate, facing: combatant.position.facing, velocity: combatant.position.speed };
    const payload = { actor: actor.id,from, to, distance, cost };

    const narrative = renderMovementNarrative(actor, from, to, distance);

    const event = createWorldEventImpl({
      id: context.uniqid(),
      ts: context.timestamp(),
      type: EventType.COMBATANT_DID_MOVE,
      location: actor.location,
      trace: trace,
      narrative,
      payload,
    });

    context.declareEvent(event);
    return [event];
  };
}
