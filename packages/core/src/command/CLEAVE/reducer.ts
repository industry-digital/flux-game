import { PureReducer, TransformerContext } from '~/types/handler';
import { CleaveCommand } from './types';
import { withBasicWorldStateValidation } from '~/command/validation';
import { withExistingCombatSession } from '~/worldkit/combat/validation';
import { createCombatSessionApi } from '~/worldkit/combat/session/session';

export const cleaveReducer: PureReducer<TransformerContext, CleaveCommand> = withBasicWorldStateValidation(
  withExistingCombatSession(
    (context, command) => {
      const { actors } = context.world;
      const actor = actors[command.actor];

      const { getCombatantApi } = createCombatSessionApi(context, actor.location, command.session);
      const combatantApi = getCombatantApi(actor.id);

      // Use the combatant API's cleave method (primitive multi-target action)
      combatantApi.cleave(command.id);

      return context;
    },
  )
);
