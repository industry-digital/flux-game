import { PureReducer, TransformerContext } from '~/types/handler';
import { DoneCommand } from './types';
import { createCombatantApi } from '~/worldkit/combat/combatant';
import { withBasicWorldStateValidation } from '../validation';
import { withExistingCombatSession } from '~/worldkit/combat/validation';

export const doneReducer: PureReducer<TransformerContext, DoneCommand> = withBasicWorldStateValidation(
  withExistingCombatSession(
    (context, command, session) => {
      const { actors } = context.world;
      const actor = actors[command.actor];

      const combatantApi = createCombatantApi(context, session, actor);
      combatantApi.done(command.id);

      return context;
    }
  )
);
