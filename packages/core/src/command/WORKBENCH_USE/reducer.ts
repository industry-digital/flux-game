import { PureReducer, TransformerContext } from '~/types/handler';
import { UseWorkbenchCommand } from './types';
import { createWorkbenchSessionApi } from '~/worldkit/workbench/session';
import { ErrorCode } from '~/types/error';

export const activateWorkbenchReducer: PureReducer<TransformerContext, UseWorkbenchCommand> = (context, command) => {
  const { declareError } = context;
  const { actors } = context.world;

  // Ensure actor exists
  const actor = actors[command.actor!];
  if (!actor) {
    declareError(ErrorCode.PRECONDITION_FAILED, command.id);
    return context;
  }

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
