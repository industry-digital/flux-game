import { PureReducer, TransformerContext } from '~/types/handler';
import { TargetCommand } from './types';
import { createCombatantApi } from '~/worldkit/combat/combatant';
import { withBasicWorldStateValidation } from '../validation';
import { withExistingCombatSession, withPreventCrossSessionTargeting } from '~/worldkit/combat/validation';

export const targetReducer: PureReducer<TransformerContext, TargetCommand> = withBasicWorldStateValidation(
  withExistingCombatSession(
    withPreventCrossSessionTargeting(
      (context, command, session) => {
        const { actors } = context.world;
        const actor = actors[command.actor];

        const combatantApi = createCombatantApi(context, session, actor);
        combatantApi.target(command.args.target, command.id);

        return context;
      }
    )
  )
);
