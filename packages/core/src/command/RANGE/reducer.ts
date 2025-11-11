import { PureReducer, TransformerContext } from '~/types/handler';
import { RangeCommand } from './types';
import { withBasicWorldStateValidation } from '../validation';
import { withExistingCombatSession } from '~/worldkit/combat/validation';
import { createCombatSessionApi } from '~/worldkit/combat/session/session';
import { withCommandType } from '~/command/withCommandType';
import { CommandType } from '~/types/intent';

const reducerCore: PureReducer<TransformerContext, RangeCommand> = (context, command) => {
  const { actors } = context.world;
  const actor = actors[command.actor];
  const { getCombatantApi } = createCombatSessionApi(context, actor.location, command.session!);
  const combatantApi = getCombatantApi(actor.id);

  combatantApi.range(command.args.target, command.id);

  return context;
};

export const rangeReducer: PureReducer<TransformerContext, RangeCommand> =
  withCommandType(CommandType.RANGE,
    withBasicWorldStateValidation(
      withExistingCombatSession(
        reducerCore,
      ),
    ),
  );
