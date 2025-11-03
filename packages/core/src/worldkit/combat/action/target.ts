import { CombatSession } from '~/worldkit/combat';
import { Actor } from '~/types/entity/actor';
import { ActionCost, Combatant } from '~/types/combat';
import { ActorURN } from '~/types/taxonomy';
import { createWorldEvent } from '~/worldkit/event';
import { EventType, WorldEvent } from '~/types/event';
import { TransformerContext } from '~/index';
import { createZeroCost } from '~/worldkit/combat/tactical-cost';

// Targeting is free - use tactical cost factory for consistency
export const TARGET_COST: Readonly<ActionCost> = createZeroCost();

export type TargetMethod = (target: ActorURN, trace?: string) => WorldEvent[];

export function createTargetMethod (
  context: TransformerContext,
  session: CombatSession,
  actor: Actor,
  combatant: Combatant,
): TargetMethod {
  return (target: ActorURN, trace: string = context.uniqid()) => {
    // Idempotent: only generate event if target is actually changing
    if (combatant.target === target) {
      return []; // No event needed, already targeting this actor
    }

    combatant.target = target;

    const event = createWorldEvent({
      trace,
      type: EventType.ACTOR_DID_ACQUIRE_TARGET,
      actor: actor.id,
      location: actor.location,
      session: session.id,
      payload: {
        target,
      },
    });

    context.declareEvent(event);

    return [event];
  };
}
