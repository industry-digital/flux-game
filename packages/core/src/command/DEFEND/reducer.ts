import { PureReducer, TransformerContext } from '~/types/handler';
import { DefendCommand } from './types';
import { createCombatSessionApi } from '~/worldkit/combat/session/session';
import { withBasicWorldStateValidation } from '../validation';
import { withExistingCombatSession } from '~/worldkit/combat/validation';
import { CombatSession } from '~/types/combat';

export const defendReducer: PureReducer<TransformerContext, DefendCommand> = withBasicWorldStateValidation(
  withExistingCombatSession(
    (context, command) => {
      const { actors, sessions } = context.world;
      const actor = actors[command.actor];
      const session = sessions[command.session!] as CombatSession;

      // Use session API to get combatant API with proper dependencies (including advanceTurn)
      const { getCombatantApi } = createCombatSessionApi(context, actor.location, session.id);
      const combatantApi = getCombatantApi(actor.id);

      combatantApi.defend(command.id, { autoDone: command.args.autoDone });

      return context;
    }
  )
);
