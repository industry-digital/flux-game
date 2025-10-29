import { PureReducer, TransformerContext } from '~/types/handler';
import { SwapShellCommand } from './types';
import { withBasicWorldStateValidation } from '~/command/validation';
import { ErrorCode } from '~/types/error';
import { createSwapShellAction } from '~/worldkit/workbench/action/swap';
import { WorldEvent } from '~/types/event';
import { withExistingWorkbenchSession } from '~/worldkit/workbench/validation';

const PREALLOCATED_EVENTS: WorldEvent[] = [];

export const swapShellReducer: PureReducer<TransformerContext, SwapShellCommand> = withBasicWorldStateValidation(
  withExistingWorkbenchSession(
    (context, command, session) => {
      const actor = context.world.actors[command.actor];
      const shell = actor.shells[command.args.targetShellId];
      if (!shell) {
        context.declareError(ErrorCode.NOT_FOUND, command.id);
        return context;
      }

      const swapAction = createSwapShellAction(context, session);
      swapAction(actor, shell.id, false, command.id, PREALLOCATED_EVENTS);

      return context;
    },
  ),
);
