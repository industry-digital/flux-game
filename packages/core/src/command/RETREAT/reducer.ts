import { PureReducer, TransformerContext } from '~/types/handler';
import { RetreatCommand } from './types';
import { createActorSessionApi } from '~/worldkit/entity/actor/session';
import { SessionStrategy } from '~/types/session';
import { CombatSession } from '~/types/combat';
import { createCombatantApi } from '~/worldkit/combat/combatant';

export const retreatReducer: PureReducer<TransformerContext, RetreatCommand> = (context, command) => {
  const { declareError } = context;
  const { actors } = context.world;
  const actor = actors[command.actor];

  if (!actor) {
    declareError('Could not find `RETREAT` actor in world projection', command.id);
    return context;
  }

  if (!actor.location) {
    declareError('`RETREAT` actor must have a location', command.id);
    return context;
  }

  // Try to infer the combat session from the actor's active sessions
  const actorSessionApi = createActorSessionApi(context.world.sessions);
  const existingCombatSession = actorSessionApi.getRunningSessionByStrategy(actor, SessionStrategy.COMBAT) as CombatSession;

  if (!existingCombatSession) {
    declareError('RETREAT: Combat session not found', command.id);
    return context;
  }

  const combatantApi = createCombatantApi(context, existingCombatSession, actor);

  // Use the combatant API's retreat method
  // Note: The retreat method already declares events internally, so we don't need to declare them again
  const { type = 'distance', distance = 1, target } = command.args;
  combatantApi.retreat(type, distance, target, command.id);

  return context;
};
