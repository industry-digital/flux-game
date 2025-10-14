import { PureReducer, TransformerContext } from '~/types/handler';
import { StrikeCommand } from './types';
import { createCombatantApi } from '~/worldkit/combat/combatant';
import { withBasicWorldStateValidation } from '../validation';
import { withExistingCombatSession, withPreventCrossSessionTargeting } from '~/worldkit/combat/validation';

export const strikeReducer: PureReducer<TransformerContext, StrikeCommand> = withBasicWorldStateValidation(
  withExistingCombatSession(
    withPreventCrossSessionTargeting(
      (context, command, session) => {
        const { actors } = context.world;
        const actor = actors[command.actor];

        const combatantApi = createCombatantApi(context, session, actor);

        // Use the combatant API's strike method (primitive action)
        combatantApi.strike(command.args.target, command.id);

        return context;
      }
    )
  )
);
