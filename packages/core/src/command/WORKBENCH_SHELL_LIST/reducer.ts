import { PureReducer, TransformerContext } from '~/types/handler';
import { ListShellsCommand } from './types';
import { createWorkbenchSessionApi } from '~/worldkit/workbench/session/session';
import { withBasicWorldStateValidation } from '~/command/validation';
import { ErrorCode } from '~/types/error';
import { WorldEvent } from '~/types/event';
import { createListShellsAction } from '~/worldkit/workbench/action/list';

const PREALLOCATED_WORLD_EVENTS: WorldEvent[] = [];

export const listShellsReducer: PureReducer<TransformerContext, ListShellsCommand> = withBasicWorldStateValidation(
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

    const listShellsAction = createListShellsAction(context, session);

    listShellsAction(actor, command.id, PREALLOCATED_WORLD_EVENTS);

    return context;
  }
);
