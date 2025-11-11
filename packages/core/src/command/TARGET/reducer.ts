import { PureReducer, TransformerContext } from '~/types/handler';
import { TargetCommand } from './types';
import { createCombatantApi } from '~/worldkit/combat/combatant';
import { withBasicWorldStateValidation } from '../validation';
import { withExistingCombatSession, withPreventCrossSessionTargeting } from '~/worldkit/combat/validation';
import { withCommandType } from '~/command/withCommandType';
import { CommandType } from '~/types/intent';

const reducerCore: PureReducer<TransformerContext, TargetCommand> = (context, command, session) => {
  const actor = context.world.actors[command.actor];
  const combatantApi = createCombatantApi(context, session, actor);
  combatantApi.target(command.args.target, command.id);

  return context;
};

export const targetReducer: PureReducer<TransformerContext, TargetCommand> =
  withCommandType(CommandType.TARGET,
    withBasicWorldStateValidation(
      withExistingCombatSession(
        withPreventCrossSessionTargeting(
          reducerCore,
        )
      )
    ),
  );
