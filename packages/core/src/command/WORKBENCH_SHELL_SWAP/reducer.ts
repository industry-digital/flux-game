import { PureReducer, TransformerContext } from '~/types/handler';
import { SwapShellCommand } from './types';
import { createWorkbenchSessionApi } from '~/worldkit/workbench/session/session';
import { withBasicWorldStateValidation } from '~/command/validation';
import { ErrorCode } from '~/types/error';
import { createSwapShellAction } from '~/worldkit/workbench/action/swap';
import { WorldEvent } from '~/types/event';

const PREALLOCATED_EVENTS: WorldEvent[] = [];

export const swapShellReducer: PureReducer<TransformerContext, SwapShellCommand> = withBasicWorldStateValidation(
  (context, command) => {
    const actor = context.world.actors[command.actor];

    // Create or retrieve workbench session using the session API
    const { session, isNew } = createWorkbenchSessionApi(
      context,
      command.actor,
      command.id,
      command.session!,
    );

    if (isNew) {
      context.declareError(ErrorCode.INVALID_SESSION, command.id);
      return context;
    }

    const shell = actor.shells[command.args.targetShellId];
    if (!shell) {
      context.declareError(ErrorCode.NOT_FOUND, command.id);
      return context;
    }

    const swapAction = createSwapShellAction(context, session);
    swapAction(actor, shell.id, false, command.id, PREALLOCATED_EVENTS);

    return context;
  }
);
