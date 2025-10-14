import { PureReducer, TransformerContext } from '~/types/handler';
import { DefendCommand } from './types';
import { createActorSessionApi } from '~/worldkit/entity/actor/session';
import { SessionStrategy } from '~/types/session';
import { CombatSession } from '~/types/combat';
import { createCombatantApi } from '~/worldkit/combat/combatant';
import { withBasicWorldStateValidation } from '../validation';

export const defendReducer: PureReducer<TransformerContext, DefendCommand> = withBasicWorldStateValidation(
  (context, command) => {
    const { declareError, world } = context;
    const actor = world.actors[command.actor];

    // Try to infer the combat session from the actor's active sessions
    const actorSessionApi = createActorSessionApi(context.world.sessions);
    const existingCombatSession = actorSessionApi.getRunningSessionByStrategy(actor, SessionStrategy.COMBAT) as CombatSession;

    if (!existingCombatSession) {
      declareError('DEFEND: Combat session not found', command.id);
      return context;
    }

    const combatantApi = createCombatantApi(context, existingCombatSession, actor);

    // Use the combatant API's defend method
    // Note: The defend method already declares events internally, so we don't need to declare them again
    combatantApi.defend(command.id);

    return context;
  }
);
