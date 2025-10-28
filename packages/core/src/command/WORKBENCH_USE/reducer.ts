import { PureReducer, TransformerContext } from '~/types/handler';
import { UseWorkbenchCommand } from './types';
import { createWorkbenchSessionApi } from '~/worldkit/workbench/session/session';
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

  // If this is a new session, add it to the actor's active sessions
  if (isNew) {
    actor.sessions[session.id] = context.timestamp();
    // Note: Event declaration is handled by createWorkbenchSessionApi
  }

  return context;
};
