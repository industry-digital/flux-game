import { PureReducer, TransformerContext } from '~/types/handler';
import { RetreatCommand } from './types';
import { createCombatSessionApi } from '~/worldkit/combat/session/session';
import { withBasicWorldStateValidation } from '~/command/validation';
import { withExistingCombatSession } from '~/worldkit/combat/validation';
import { MovementOptions } from '~/worldkit/combat/action/factory/movement';
import { withCommandType } from '~/command/withCommandType';
import { CommandType } from '~/types/intent';
import { ErrorCode } from '~/types/error';

const DISTANCE = 'distance';
const AP = 'ap';
const MAX = 'max';

const DEFAULT_MOVEMENT_OPTIONS: MovementOptions = {
  autoDone: true, // Manual commands should auto-advance turns when AP is depleted
};

const reducerCore: PureReducer<TransformerContext, RetreatCommand> = (context, command, session) => {
  const { world, declareError } = context;
  const actor = world.actors[command.actor];
  const { getCombatantApi } = createCombatSessionApi(context, actor.location, session.id);
  const { retreat } = getCombatantApi(actor.id);

  switch (command.args.type) {
    case DISTANCE:
      retreat(DISTANCE, command.args.distance, command.id, DEFAULT_MOVEMENT_OPTIONS);
      break;

    case AP:
      retreat(AP, command.args.ap, command.id, DEFAULT_MOVEMENT_OPTIONS);
      break;

    case MAX:
      retreat(MAX, 0, command.id, DEFAULT_MOVEMENT_OPTIONS); // Value ignored for max movement
      break;

    default:
      declareError(ErrorCode.INVALID_ACTION, command.id);
      break;
  }

  return context;
};

export const retreatReducer: PureReducer<TransformerContext, RetreatCommand> =
  withCommandType(CommandType.RETREAT,
    withBasicWorldStateValidation(
      withExistingCombatSession(
        reducerCore,
      ),
    ),
  );
