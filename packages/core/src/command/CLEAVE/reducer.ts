import { PureReducer, TransformerContext } from '~/types/handler';
import { CleaveCommand } from './types';
import { withBasicWorldStateValidation } from '~/command/validation';
import { withExistingCombatSession } from '~/worldkit/combat/validation';
import { createCombatSessionApi } from '~/worldkit/combat/session/session';
import { CommandType } from '~/types/intent';
import { withCommandType } from '~/command/withCommandType';

const reducerCore: PureReducer<TransformerContext, CleaveCommand> = (context, command) => {
  const actor = context.world.actors[command.actor];
  const { getCombatantApi } = createCombatSessionApi(context, actor.location, command.session);
  const combatantApi = getCombatantApi(actor.id);

  combatantApi.cleave(command.id);

  return context;
};

export const cleaveReducer: PureReducer<TransformerContext, CleaveCommand> =
  withCommandType(CommandType.CLEAVE,
    withBasicWorldStateValidation(
      withExistingCombatSession(
        reducerCore,
      ),
    ),
  );
