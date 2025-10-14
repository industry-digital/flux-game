import { PureReducer, TransformerContext } from '~/types/handler';
import { DefendCommand } from './types';
import { createCombatantApi } from '~/worldkit/combat/combatant';
import { withBasicWorldStateValidation } from '../validation';
import { withExistingCombatSession } from '~/worldkit/combat/validation';

export const defendReducer: PureReducer<TransformerContext, DefendCommand> = withBasicWorldStateValidation(
  withExistingCombatSession(
    (context, command, session) => {
      const { actors } = context.world;
      const actor = actors[command.actor];

      const combatantApi = createCombatantApi(context, session, actor);
      combatantApi.defend(command.id);

      return context;
    }
  )
);
