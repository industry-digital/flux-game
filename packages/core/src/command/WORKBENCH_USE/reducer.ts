import { PureReducer, TransformerContext } from '~/types/handler';
import { UseWorkbenchCommand } from './types';
import { EventType } from '~/types/event';
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

    context.declareEvent({
      type: EventType.WORKBENCH_SESSION_DID_START,
      actor: actor.id,
      location: actor.location,
      trace: command.id,
      payload: {
        sessionId: session.id,
      },
    });
  }

  return context;
};
