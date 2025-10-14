import { PureReducer, TransformerContext } from '~/types/handler';
import { CleaveCommand } from './types';
import { createCombatSessionApi } from '~/worldkit/combat/session/session';
import { Team } from '~/types/combat';

export const cleaveReducer: PureReducer<TransformerContext, CleaveCommand> = (context, command) => {
  console.log('🗡️ CLEAVE REDUCER CALLED:', { actor: command.actor, session: command.session });
  const { declareError } = context;
  const { actors } = context.world;
  const actor = actors[command.actor];

  if (!actor) {
    declareError('Could not find `CLEAVE` actor in world projection', command.id);
    return context;
  }

  if (!actor.location) {
    declareError('`CLEAVE` actor must have a location', command.id);
    return context;
  }

  const { session, isNew, getCombatantApi: useCombatant, addCombatant } = createCombatSessionApi(context, actor.location, command.session);

  if (isNew) {
    addCombatant(actor.id, Team.BRAVO);
    // Note: CLEAVE doesn't pre-add targets since it discovers them dynamically
    // The cleave action will handle adding any enemies it finds to combat
  }

  const combatantApi = useCombatant(actor.id);

  // Use the combatant API's cleave method (primitive multi-target action)
  // Note: The cleave method already declares events internally, so we don't need to declare them again
  combatantApi.cleave(command.id);

  return context;
};
