import { Shells } from '~/types/entity/actor';
import { SessionStatus } from '~/types/entity/session';
import { Shell } from '~/types/entity/shell';
import { ErrorCode } from '~/types/error';
import { PureReducer, TransformerContext } from '~/types/handler';
import { Command } from '~/types/intent';
import { WorkbenchSession } from '~/types/workbench';

/**
 * Workbench shell command reducer signature
 * Shell operations always happen within a workbench session context
 */
export type WorkbenchShellCommandReducer = (
  context: TransformerContext,
  command: Command,
  session: WorkbenchSession,
  shells: Shells,
  currentShell: Shell
) => TransformerContext;

/**
 * Validates workbench session and shell access for commands
 * Shell operations are inherently workbench operations that require:
 * - An active workbench session
 * - Actor with shells (PCs only)
 * - Valid current shell
 */
export const withWorkbenchShell = (
  reducer: WorkbenchShellCommandReducer,
): PureReducer<TransformerContext, Command> => {
  return (context, command) => {
    const { world, failed } = context;
    const actor = world.actors[command.actor];

    // Validate session exists
    if (!actor.session) {
      return failed(command.id, ErrorCode.PRECONDITION_FAILED);
    }
    const session = world.sessions[actor.session] as WorkbenchSession;
    if (!session) {
      return failed(command.id, ErrorCode.SESSION_NOT_FOUND);
    }

    if (session.status !== SessionStatus.RUNNING) {
      return failed(command.id, ErrorCode.INVALID_SESSION);
    }

    // Validate shells exist
    if (!actor.shells || !actor.currentShell) {
      return failed(command.id, ErrorCode.PRECONDITION_FAILED);
    }
    const currentShell = actor.shells[actor.currentShell];
    if (!currentShell) {
      return failed(command.id, ErrorCode.SHELL_NOT_FOUND);
    }

    return reducer(context, command, session, actor.shells, currentShell);
  };
};
