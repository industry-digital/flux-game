import { PureReducer, TransformerContext } from '~/types/handler';
import { DefendCommand } from './types';
import { createCombatSessionApi } from '~/worldkit/combat/session/session';
import { withBasicWorldStateValidation } from '../validation';
import { withExistingCombatSession } from '~/worldkit/combat/validation';
import { withCommandType } from '~/command/withCommandType';
import { CommandType } from '~/types/intent';

const reducerCore: PureReducer<TransformerContext, DefendCommand> = (context, command, session) => {
  const actor = context.world.actors[command.actor];
  const { getCombatantApi } = createCombatSessionApi(context, actor.location, session.id);
  const combatantApi = getCombatantApi(actor.id);

  combatantApi.defend(command.id, { autoDone: true });

  return context;
};

export const defendReducer: PureReducer<TransformerContext, DefendCommand> =
  withCommandType(CommandType.DEFEND,
    withBasicWorldStateValidation(
      withExistingCombatSession(
        reducerCore,
      ),
    ),
  );
