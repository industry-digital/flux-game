import { WorldEvent, EventType, ActorDidAssessRange } from '~/types/event';
import { TransformerContext } from '~/types/handler';
import { ActorURN } from '~/types/taxonomy';
import { CombatSession, MovementDirection } from '~/types/combat';
import { Actor } from '~/types/entity/actor';
import { Combatant } from '~/types/combat';
import { createWorldEvent } from '~/worldkit/event';
import { computeDistanceBetweenCombatants } from '~/worldkit/combat/range';

export type RangeMethodDependencies = {
  computeDistanceBetweenCombatants: typeof computeDistanceBetweenCombatants;
};

export const DEFAULT_RANGE_DEPS: Readonly<RangeMethodDependencies> = Object.freeze({
  computeDistanceBetweenCombatants,
});

export type RangeMethod = (target: ActorURN, trace?: string) => WorldEvent[];

export const createRangeMethod = (
  context: TransformerContext,
  session: CombatSession,
  actor: Actor,
  combatant: Combatant,
  deps: RangeMethodDependencies = DEFAULT_RANGE_DEPS,
): RangeMethod => {

  return function range(target: ActorURN, trace = context.uniqid()): WorldEvent[] {
    const { declareError } = context;

    // Validate that the target exists in the combat session
    const targetCombatant = session.data.combatants.get(target);
    if (!targetCombatant) {
      declareError(`Target "${target}" not found in combat.`, trace);
      return [];
    }

    // Validate that the target actor exists in the world
    const targetActor = context.world.actors[target];
    if (!targetActor) {
      declareError(`Target actor "${target}" not found.`, trace);
      return [];
    }

    // Calculate the distance between the two combatants
    const range = deps.computeDistanceBetweenCombatants(combatant, targetCombatant);

    // Calculate relative direction based on positions and facing
    // If target is in the direction we're facing, it's FORWARD; otherwise BACKWARD
    const targetRelativePosition = targetCombatant.position.coordinate - combatant.position.coordinate;
    const facingDirection = combatant.position.facing; // CombatFacing.RIGHT = 1, CombatFacing.LEFT = -1

    // If the sign of targetRelativePosition matches the facing direction, target is in front
    const direction = (targetRelativePosition * facingDirection) >= 0
      ? MovementDirection.FORWARD
      : MovementDirection.BACKWARD;

    // Create the range acquisition event
    const rangeEvent: ActorDidAssessRange = createWorldEvent({
      type: EventType.ACTOR_DID_ASSESS_RANGE,
      location: actor.location,
      trace: trace,
      actor: actor.id,
      payload: {
        target: target,
        range: range,
        direction: direction,
      },
    });

    // Declare the event to the context
    context.declareEvent(rangeEvent);

    return [rangeEvent];
  };
};
