import { PureReducer, TransformerContext } from '~/types/handler';
import { AssessShellStatusCommand } from './types';
import { createWorkbenchSessionApi } from '~/worldkit/workbench/session/session';
import { withBasicWorldStateValidation } from '~/command/validation';
import { ErrorCode } from '~/types/error';
import { WorldEvent } from '~/types/event';
import { createGetShellStatusAction } from '~/worldkit/workbench/action/status';

const PREALLOCATED_WORLD_EVENTS: WorldEvent[] = [];

export const shellStatusReducer: PureReducer<TransformerContext, AssessShellStatusCommand> = withBasicWorldStateValidation(
  (context, command) => {
    const actor = context.world.actors[command.actor];

    if (!command.session) {
      context.declareError(ErrorCode.INVALID_SESSION, command.id);
      return context;
    }

    // Create or retrieve workbench session using the session API
    const { session, isNew } = createWorkbenchSessionApi(
      context,
      command.actor,
      command.id,
      command.session,
    );

    if (isNew) {
      // Can't get shell status without an existing workbench session
      context.declareError(ErrorCode.INVALID_SESSION, command.id);
      return context;
    }

    const getShellStatusAction = createGetShellStatusAction(context, session);

    getShellStatusAction(actor, command.id, PREALLOCATED_WORLD_EVENTS);

    return context;
  }
);
