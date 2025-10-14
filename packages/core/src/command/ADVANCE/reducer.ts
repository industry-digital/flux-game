import { PureReducer, TransformerContext } from '~/types/handler';
import { AdvanceCommand } from './types';
import { createCombatSessionApi } from '~/worldkit/combat/session/session';
import { Team } from '~/types/combat';
import { withBasicWorldStateValidation } from '~/command/validation';

export const advanceReducer: PureReducer<TransformerContext, AdvanceCommand> = withBasicWorldStateValidation(
  (context, command) => {
    const actor = context.world.actors[command.actor];
    const targetActor = context.world.actors[command.args.target!];

    const { session, isNew, getCombatantApi: useCombatant, addCombatant, startCombat } = createCombatSessionApi(context, actor.location, command.session);

    if (isNew) {
      if (!targetActor) {
        context.declareError('ADVANCE: Target not found', command.id);
        return context;
      }

      addCombatant(actor.id, Team.ALPHA);
      addCombatant(targetActor.id, Team.BRAVO);
    }

    // Use the combatant API's advance method
    // Note: The advance method already declares events internally, so we don't need to declare them again
    const combatantApi = useCombatant(actor.id);
    const moveBy = command.args.type === 'distance' ? 'distance' : 'ap';
    combatantApi.advance(moveBy, command.args.distance || 1, command.args.target, command.id);

    return context;
  };
};
