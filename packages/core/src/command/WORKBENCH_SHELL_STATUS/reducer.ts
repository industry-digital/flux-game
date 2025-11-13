import { PureReducer, TransformerContext } from '~/types/handler';
import { AssessShellStatusCommand } from './types';
import { withBasicWorldStateValidation } from '~/command/validation';
import { WorldEvent } from '~/types/event';
import { createGetShellStatusAction } from '~/worldkit/workbench/action/status';
import { withCommandType } from '~/command/withCommandType';
import { CommandType } from '~/types/intent';
import { WorkbenchShellCommandReducer, withWorkbenchShell } from '~/command/shell';

const PREALLOCATED_WORLD_EVENTS: WorldEvent[] = [];

const reducerCore: WorkbenchShellCommandReducer = (context, command, session) => {
  const actor = context.world.actors[command.actor];
  const getShellStatusAction = createGetShellStatusAction(context, session);
  getShellStatusAction(actor, command.id, PREALLOCATED_WORLD_EVENTS);
  return context;
};

export const shellStatusReducer: PureReducer<TransformerContext, AssessShellStatusCommand> =
  withCommandType(CommandType.WORKBENCH_SHELL_STATUS,
    withBasicWorldStateValidation(
      withWorkbenchShell(
        reducerCore,
      ),
    ),
  );
