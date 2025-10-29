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

        const { combatant, ...combatantApi } = createCombatantApi(context, session, actor);

        // Use explicit target from command, or fall back to combatant's current target
        const targetId = command.args.target || combatant.target;

        if (!targetId) {
          context.declareError('No target specified and no current target set. Use "target <name>" first or "strike <name>".', command.id);
          return context;
        }

        // Use the combatant API's strike method (primitive action)
        combatantApi.strike(targetId, command.id);

        return context;
      },
      true // Target is optional
    )
  )
);
