import { PureReducer, TransformerContext } from '~/types/handler';
import { TargetCommand } from './types';
import { createCombatantApi } from '~/worldkit/combat/combatant';
import { withBasicWorldStateValidation } from '../validation';
import { withExistingCombatSession, withPreventCrossSessionTargeting } from '~/worldkit/combat/validation';
import { CombatSession } from '~/types/combat';

export const targetReducer: PureReducer<TransformerContext, TargetCommand> = withBasicWorldStateValidation(
  withExistingCombatSession(
    withPreventCrossSessionTargeting(
      (context, command) => {
        const { actors, sessions } = context.world;
        const actor = actors[command.actor];
        const session = sessions[command.session!] as CombatSession;

        const combatantApi = createCombatantApi(context, session, actor);
        combatantApi.target(command.args.target, command.id);

        return context;
      }
    )
  )
);
