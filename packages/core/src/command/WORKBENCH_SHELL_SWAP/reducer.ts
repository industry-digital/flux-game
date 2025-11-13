import { PureReducer, TransformerContext } from '~/types/handler';
import { SwapShellCommand } from './types';
import { withBasicWorldStateValidation } from '~/command/validation';
import { createSwapShellAction } from '~/worldkit/workbench/action/swap';
import { WorldEvent } from '~/types/event';
import { withCommandType } from '~/command/withCommandType';
import { CommandType } from '~/types/intent';
import { WorkbenchShellCommandReducer, withWorkbenchShell } from '~/command/shell';
import { ErrorCode } from '~/types/error';

const PREALLOCATED_EVENTS: WorldEvent[] = [];

const reducerCore: WorkbenchShellCommandReducer = (context, command, session, shells, _currentShell) => {
  const { world, failed } = context;
  const actor = world.actors[command.actor];

  // Validate target shell exists
  const targetShell = shells[command.args.targetShellId];
  if (!targetShell) {
    return failed(command.id, ErrorCode.SHELL_NOT_FOUND);
  }

  const swapAction = createSwapShellAction(context, session);
  swapAction(actor, targetShell.id, false, command.id, PREALLOCATED_EVENTS);

  return context;
};

export const swapShellReducer: PureReducer<TransformerContext, SwapShellCommand> =
  withCommandType(CommandType.WORKBENCH_SHELL_SWAP,
    withBasicWorldStateValidation(
      withWorkbenchShell(
        reducerCore,
      ),
    ),
  );
