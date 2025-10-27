import { PureReducer, TransformerContext } from '~/types/handler';
import { SwapShellCommand } from './types';
import { createWorkbenchSessionApi } from '~/worldkit/workbench/session/session';
import { withBasicWorldStateValidation } from '~/command/validation';
import { ErrorCode } from '~/types/error';
import { findShellByNameOrId } from '~/worldkit/entity/actor/shell';
import { createSwapShellAction } from '~/worldkit/workbench/action/swap';
import { WorldEvent } from '~/types/event';

const PREALLOCATED_SWAP_ACTION_OUTPUT: WorldEvent[] = [];

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

    const shell = findShellByNameOrId(actor, command.args.targetShellNameOrId);
    if (!shell) {
      context.declareError(ErrorCode.INVALID_TARGET, command.id);
      return context;
    }

    const swapAction = createSwapShellAction(context, session);
    const events = swapAction(actor, shell.id, false, command.id, PREALLOCATED_SWAP_ACTION_OUTPUT);

    for (const event of events) {
      context.declareEvent(event);
    }

    return context;
  }
);
