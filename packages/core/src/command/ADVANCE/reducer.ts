import { PureReducer, TransformerContext } from '~/types/handler';
import { AdvanceCommand } from './types';
import { createCombatSessionApi } from '~/worldkit/combat/session/session';
import { Team } from '~/types/combat';

export const advanceReducer: PureReducer<TransformerContext, AdvanceCommand> = (context, command) => {
  const { declareError } = context;
  const { actors } = context.world;
  const actor = actors[command.actor];

  if (!actor) {
    declareError('Could not find `ADVANCE` actor in world projection', command.id);
    return context;
  }

  if (!actor.location) {
    declareError('`ADVANCE` actor must have a location', command.id);
    return context;
  }

  const { session, isNew, getCombatantApi: useCombatant, addCombatant } = createCombatSessionApi(context, actor.location, command.session);

  if (isNew) {
    addCombatant(actor.id, Team.BRAVO);
    // Note: ADVANCE doesn't pre-add targets since it's a movement action
  }

  const combatantApi = useCombatant(actor.id);

  // Use the combatant API's advance method
  // Note: The advance method already declares events internally, so we don't need to declare them again
  const moveBy = command.args.type === 'distance' ? 'distance' : 'ap';
  combatantApi.advance(moveBy, command.args.distance || 1, command.args.target, command.id);

  return context;
};
