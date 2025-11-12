import { PureReducer, TransformerContext } from '~/types/handler';
import { DoneCommand } from './types';
import { withBasicWorldStateValidation } from '../validation';
import { withExistingCombatSession } from '~/worldkit/combat/validation';
import { createCombatSessionApi } from '~/worldkit/combat/session/session';
import { withCommandType } from '~/command/withCommandType';
import { CommandType } from '~/types/intent';

const reducerCore: PureReducer<TransformerContext, DoneCommand> = (context, command, session) => {
  const { world, failed } = context;
  const actor = world.actors[command.actor];
  const { getCombatantApi } = createCombatSessionApi(context, actor.location, session.id);
  const combatantApi = getCombatantApi(actor.id);

  combatantApi.done(command.id);

  return context;
};

export const doneReducer: PureReducer<TransformerContext, DoneCommand> =
  withCommandType(CommandType.DONE,
    withBasicWorldStateValidation(
      withExistingCombatSession(
        reducerCore,
      ),
    ),
  );
