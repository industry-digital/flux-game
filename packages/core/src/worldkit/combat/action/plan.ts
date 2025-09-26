import { Actor } from '~/types/entity/actor';
import { Combatant, CombatSession } from '~/types/combat';
import { TransformerContext } from '~/types/handler';
import { WorldEvent } from '~/types/event';
import { createDoneMethod, DoneMethod } from '~/worldkit/combat/action/done';
import { AdvanceMethod, createAdvanceMethod } from '~/worldkit/combat/action/advance';
import { createRetreatMethod, RetreatMethod } from '~/worldkit/combat/action/retreat';
import { createStrikeMethod, StrikeMethod } from '~/worldkit/combat/action/strike';
import { TargetMethod } from '~/worldkit/combat/action/target';
import { createDefendMethod, DefendMethod } from '~/worldkit/combat/action/defend';

type PlanOptions = {};

export type PlanDependencies = {
  done?: DoneMethod;
  defend?: DefendMethod;
  strike?: StrikeMethod;
  advance?: AdvanceMethod;
  retreat?: RetreatMethod;
  target?: TargetMethod;

};

export type PlanMethod = (trace?: string, options?: PlanOptions) => WorldEvent[];

export function createPlanMethod (
  context: TransformerContext,
  session: CombatSession,
  actor: Actor,
  combatant: Combatant,
  deps: PlanDependencies,
): PlanMethod {
  const {
    done: doneImpl = createDoneMethod(context, session, actor, combatant, { advanceTurn: () => [] }),
    defend: defendImpl = createDefendMethod(context, session, actor, combatant, { done: doneImpl }),
    strike: strikeImpl = createStrikeMethod(context, session, actor, combatant),
    advance: advanceImpl = createAdvanceMethod(context, session, actor, combatant),
    retreat: retreatImpl = createRetreatMethod(context, session, actor, combatant),
    target,
  } = deps;


  return (trace: string = context.uniqid(), options?: PlanOptions) => {
    const events: WorldEvent[] = [];

    const doneEvents = doneImpl(trace);
    events.push(...doneEvents);

    return events;
  };
}
