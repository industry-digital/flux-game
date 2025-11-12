import { PureReducer, TransformerContext } from '~/types/handler';
import { StrikeCommand } from './types';
import { createCombatantApi } from '~/worldkit/combat/combatant';
import { withBasicWorldStateValidation } from '../validation';
import { withExistingCombatSession, withPreventCrossSessionTargeting } from '~/worldkit/combat/validation';
import { withCommandType } from '~/command/withCommandType';
import { CommandType } from '~/types/intent';
import { ErrorCode } from '~/types/error';

const reducerCore: PureReducer<TransformerContext, StrikeCommand> = (context, command, session) => {
  const { world, failed } = context;
  const actor = world.actors[command.actor];
  const { combatant, ...combatantApi } = createCombatantApi(context, session, actor);
  const targetId = command.args.target || combatant.target;

  if (!targetId) {
    return failed(command.id, ErrorCode.INVALID_SYNTAX);
  }

  combatantApi.strike(targetId, command.id);

  return context;
};

export const strikeReducer: PureReducer<TransformerContext, StrikeCommand> =
  withCommandType(CommandType.STRIKE,
    withBasicWorldStateValidation(
      withExistingCombatSession(
        withPreventCrossSessionTargeting(
          reducerCore,
          true // Target is optional
        ),
      ),
    ),
  );
