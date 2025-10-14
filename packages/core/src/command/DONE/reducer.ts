import { PureReducer } from '~/types/handler';
import { TransformerContext } from '~/types/handler';
import { DoneCommand } from './types';
import { createActorSessionApi } from '~/worldkit/entity/actor/session';
import { SessionStrategy } from '~/types/session';
import { CombatSession } from '~/types/combat';
import { createCombatantApi } from '~/worldkit/combat/combatant';

export const doneReducer: PureReducer<TransformerContext, DoneCommand> = (context, command) => {
  const { declareError } = context;
  const { actors, sessions } = context.world;

  const actor = actors[command.actor!];
  if (!actor) {
    declareError('Actor not found in world projection', command.id);
    return context;
  }

  // Try to infer the combat session from the actor's active sessions
  const actorSessionApi = createActorSessionApi(context.world.sessions);
  const existingCombatSession = actorSessionApi.getRunningSessionByStrategy(actor, SessionStrategy.COMBAT) as CombatSession;

  if (!existingCombatSession) {
    declareError('DONE: Combat session not found', command.id);
    return context;
  }

  const combatantApi = createCombatantApi(context, existingCombatSession, actor);

  // Use the combatant API's attack method which includes turn advancement
  // Note: The attack method already declares events internally, so we don't need to declare them again
  combatantApi.done(command.id);

  return context;
};
