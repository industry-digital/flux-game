import { PureReducer, TransformerContext } from '~/types/handler';
import { DefendCommand } from './types';
import { createCombatantApi } from '~/worldkit/combat/combatant';
import { withBasicWorldStateValidation } from '../validation';
import { withExistingCombatSession } from '~/worldkit/combat/validation';
import { CombatSession } from '~/types/combat';

export const defendReducer: PureReducer<TransformerContext, DefendCommand> = withBasicWorldStateValidation(
  withExistingCombatSession(
    (context, command) => {
      const { actors, sessions } = context.world;
      const actor = actors[command.actor];
      const session = sessions[command.session!] as CombatSession;

      const combatantApi = createCombatantApi(context, session, actor);
      combatantApi.defend(command.id, { autoDone: command.args.autoDone });

      return context;
    }
  )
);
