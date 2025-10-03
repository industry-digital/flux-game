import { isCommandOfType } from '~/lib/intent';
import { ActorCommand, Command, CommandType } from '~/types/intent';
import { PureReducer, TransformerContext, PureHandlerInterface } from '~/types/handler';
import { SessionURN } from '~/types/taxonomy';
import { EventType } from '~/types/event';
import { createWorkbenchSessionApi } from '~/worldkit/workbench/session/session';

export type UseWorkbenchCommandArgs = {
  sessionId?: SessionURN;
};

export type UseWorkbenchCommand = ActorCommand<CommandType.USE_WORKBENCH, UseWorkbenchCommandArgs>;

export const useWorkbenchReducer: PureReducer<TransformerContext, UseWorkbenchCommand> = (context, command) => {
  const { declareError } = context;
  const { actors } = context.world;

  // Ensure actor exists
  const actor = actors[command.actor!];
  if (!actor) {
    declareError('Actor not found in world projection', command.id);
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
    context.actorSessionApi.addToActiveSessions(actor, session.id);
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

export class USE_WORKBENCH implements PureHandlerInterface<TransformerContext, UseWorkbenchCommand> {
  reduce = useWorkbenchReducer;
  dependencies = [];
  handles = (command: Command): command is UseWorkbenchCommand => {
    return isCommandOfType<CommandType.USE_WORKBENCH, UseWorkbenchCommandArgs>(command, CommandType.USE_WORKBENCH);
  };

  parse (intent: string): UseWorkbenchCommand | undefined {
    return undefined;
  }
}
