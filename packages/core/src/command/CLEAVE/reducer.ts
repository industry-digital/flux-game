import { PureReducer, TransformerContext } from '~/types/handler';
import { CleaveCommand } from './types';
import { createCombatantApi } from '~/worldkit/combat/combatant';
import { withBasicWorldStateValidation } from '~/command/validation';
import { withExistingCombatSession } from '~/worldkit/combat/validation';

export const cleaveReducer: PureReducer<TransformerContext, CleaveCommand> = withBasicWorldStateValidation(
  withExistingCombatSession(
    (context, command, session) => {
      const { actors } = context.world;
      const actor = actors[command.actor];

      const combatantApi = createCombatantApi(context, session, actor);

      // Use the combatant API's cleave method (primitive multi-target action)
      combatantApi.cleave(command.id);

      return context;
    },
  )
);
