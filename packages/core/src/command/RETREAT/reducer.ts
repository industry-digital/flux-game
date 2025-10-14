import { PureReducer, TransformerContext } from '~/types/handler';
import { RetreatCommand } from './types';
import { createCombatantApi } from '~/worldkit/combat/combatant';
import { withBasicWorldStateValidation } from '../validation';
import { withExistingCombatSession } from '~/worldkit/combat/validation';

export const retreatReducer: PureReducer<TransformerContext, RetreatCommand> = withBasicWorldStateValidation(
  withExistingCombatSession(
    (context, command, session) => {
      const { actors } = context.world;
      const actor = actors[command.actor];

      const combatantApi = createCombatantApi(context, session, actor);

      // Use the combatant API's retreat method
      const { type = 'distance', distance = 1, target } = command.args;
      combatantApi.retreat(type, distance, target, command.id);

      return context;
    }
  )
);
