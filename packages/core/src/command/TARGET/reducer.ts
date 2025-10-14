import { PureReducer, TransformerContext } from '~/types/handler';
import { TargetCommand } from './types';
import { createActorSessionApi } from '~/worldkit/entity/actor/session';
import { SessionStrategy } from '~/types/session';
import { CombatSession } from '~/types/combat';
import { createCombatantApi } from '~/worldkit/combat/combatant';
import { withBasicWorldStateValidation } from '../validation';

export const targetReducer: PureReducer<TransformerContext, TargetCommand> = withBasicWorldStateValidation(
  (context, command) => {
    const { declareError, world } = context;
    const { actors } = world;
    const actor = actors[command.actor];
    const targetActor = actors[command.args.target];

    if (!targetActor) {
      declareError('Could not find `TARGET` target in world projection', command.id);
      return context;
    }

    if (actor.location !== targetActor.location) {
      declareError('`TARGET` actor and target must be in the same location', command.id);
      return context;
    }

    // Try to infer the combat session from the actor's active sessions
    const actorSessionApi = createActorSessionApi(context.world.sessions);
    const existingCombatSession = actorSessionApi.getRunningSessionByStrategy(actor, SessionStrategy.COMBAT) as CombatSession;

    if (!existingCombatSession) {
      declareError('TARGET: Combat session not found', command.id);
      return context;
    }

    const combatantApi = createCombatantApi(context, existingCombatSession, actor);
    combatantApi.target(targetActor.id, command.id);

    return context;
  }
);
