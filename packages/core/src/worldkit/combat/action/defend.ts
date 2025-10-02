import { Actor } from '~/types/entity/actor';
import { ActionCost, Combatant, CombatSession } from '~/types/combat';
import { TransformerContext } from '~/types/handler';
import { EventType, WorldEvent } from '~/types/event';
import { createWorldEvent } from '~/worldkit/event';
import { deductAp } from '~/worldkit/combat/combatant';
import { createDoneMethod, DoneMethod } from '~/worldkit/combat/action/done';
import { createDefendCost } from '~/worldkit/combat/tactical-cost';

type DefendOptions = {
  autoDone?: boolean;
};

export type DefendDependencies = {
  done?: DoneMethod;
  createDefendCost?: typeof createDefendCost;
};

export type DefendMethod = (trace?: string, options?: DefendOptions) => WorldEvent[];

export const DEFAULT_DEFEND_OPTIONS: DefendOptions = {
  autoDone: false,
};

export const DEFAULT_DEFEND_DEPENDENCIES: DefendDependencies = {};

export function createDefendMethod (
  context: TransformerContext,
  session: CombatSession,
  actor: Actor,
  combatant: Combatant,
  deps: DefendDependencies = DEFAULT_DEFEND_DEPENDENCIES,
): DefendMethod {
  const {
    done = createDoneMethod(context, session, actor, combatant),
    createDefendCost: createDefendCostImpl = createDefendCost,
  } = deps;

  return (trace: string = context.uniqid(), options?: DefendOptions) => {
    const { autoDone = DEFAULT_DEFEND_OPTIONS.autoDone } = options ?? {};
    const events: WorldEvent[] = [];

    // Use tactical cost factory for defend action (uses all remaining AP)
    const cost: ActionCost = createDefendCostImpl(combatant.ap.eff.cur);

    // Apply AP cost (already tactically calculated)
    deductAp(combatant, cost.ap!);


    const narrative = { self: '', observer: '' };
    const defendEvent = createWorldEvent({
      type: EventType.COMBATANT_DID_DEFEND,
      location: actor.location,
      trace: trace,
      payload: { actor: actor.id, cost },
      narrative,
    });

    context.declareEvent(defendEvent);
    events.push(defendEvent);

    // Auto-advance turn if requested
    if (autoDone && done) {
      const doneEvents = done(trace);
      events.push(...doneEvents);
    }

    return events;
  };
}
