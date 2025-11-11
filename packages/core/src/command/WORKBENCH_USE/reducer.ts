import { PureReducer, TransformerContext } from '~/types/handler';
import { UseWorkbenchCommand } from './types';
import { createWorkbenchSessionApi } from '~/worldkit/workbench/session';
import { withCommandType } from '~/command/withCommandType';
import { CommandType } from '~/types/intent';
import { withBasicWorldStateValidation } from '~/command/validation';

const reducerCore: PureReducer<TransformerContext, UseWorkbenchCommand> = (context, command) => {
  const actor = context.world.actors[command.actor];

  // TODO: Check if there is a workbench entity at actor's `location`.

  // Create or retrieve workbench session using the session API
  const { session, isNew } = createWorkbenchSessionApi(
    context,
    actor.id,
    command.id,
    command.args.sessionId
  );

  if (isNew) {
    actor.session = session.id;
    // Note: Event declaration is handled by createWorkbenchSessionApi
  }

  return context;
};

export const activateWorkbenchReducer: PureReducer<TransformerContext, UseWorkbenchCommand> =
  withCommandType(CommandType.WORKBENCH_USE,
    withBasicWorldStateValidation(
      reducerCore,
    ),
  );
