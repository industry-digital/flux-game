import { PureReducer, TransformerContext } from '~/types/handler';
import { AttackCommand } from './types';
import { createCombatSessionApi } from '~/worldkit/combat/session/session';
import { createActorSessionApi } from '~/worldkit/entity/actor/session';
import { Team } from '~/types/combat';
import { SessionStrategy } from '~/types/session';

export const attackReducer: PureReducer<TransformerContext, AttackCommand> = (context, command) => {
  const { declareError } = context;
  const { actors } = context.world;
  const targetActor = actors[command.args.target!];

  if (!targetActor) {
    declareError('Could not find `ATTACK` target in world projection', command.id);
    return context;
  }

  const actor = actors[command.actor!];

  if (!actor) {
    declareError('Could not find `ATTACK` actor in world projection', command.id);
    return context;
  }

  if (actor.location !== targetActor.location) {
    declareError('`ATTACK` actor and target must be in the same location', command.id);
    return context;
  }

  // Try to infer the combat session from the actor's active sessions
  const actorSessionApi = createActorSessionApi(context.world.sessions);
  const existingCombatSession = actorSessionApi.getRunningSessionByStrategy(actor, SessionStrategy.COMBAT);

  console.log(`🔍 Inferred combat session: ${existingCombatSession?.id || 'none'}`);
  console.log(`🔍 Command session parameter: ${command.session || 'undefined'}`);

  // Use the inferred session ID, fallback to command.session if no running combat session found
  const sessionId = existingCombatSession?.id || command.session;

  const { isNew, getCombatantApi, addCombatant } = createCombatSessionApi(context, actor.location, sessionId);

  if (isNew) {
    addCombatant(actor.id, Team.BRAVO);
    addCombatant(targetActor.id, Team.ALPHA);
  }

  const combatantApi = getCombatantApi(actor.id);

  // Use the combatant API's attack method which includes turn advancement
  // Note: The attack method already declares events internally, so we don't need to declare them again
  combatantApi.attack(command.args.target, command.id);

  return context;
};
