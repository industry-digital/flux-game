import { ErrorCode } from '~/types/error';
import { PureReducer, TransformerContext } from '~/types/handler';
import { Command } from '~/types/intent';
import { WorkbenchSession } from '~/types/workbench';
import { createWorkbenchSessionApi } from './session';

/**
 * Higher-order function that ensures the command has a valid workbench session
 * Validates that:
 * 1. The command contains a session field
 * 2. The session exists in the world projection
 * 3. The session is a workbench session
 * 4. The actor is actually in the workbench session
 * 5. The session is not newly created (must be existing)
 */
export function withExistingWorkbenchSession<TCommand extends Command>(
  reducer: (context: TransformerContext, command: TCommand, session: WorkbenchSession) => TransformerContext
): PureReducer<TransformerContext, TCommand> {
  return (context: TransformerContext, command: TCommand) => {
    // Use the standard workbench session API to get or create session
    const { session, isNew } = createWorkbenchSessionApi(
      context,
      command.actor,
      command.id,
      command.session!
    );

    // Reject newly created sessions - we only want existing ones
    if (isNew) {
      context.declareError(ErrorCode.INVALID_SESSION, command.id);
      return context;
    }

    // Ensure the actor is actually in the workbench session
    if (session.data.actorId !== command.actor) {
      context.declareError(ErrorCode.FORBIDDEN, command.id);
      return context;
    }

    // All validations passed, call the wrapped reducer
    return reducer(context, command, session);
  };
}
