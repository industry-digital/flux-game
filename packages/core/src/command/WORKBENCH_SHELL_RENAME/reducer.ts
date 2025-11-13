import { PureReducer, TransformerContext } from '~/types/handler';
import { RenameShellCommand } from './types';
import { withBasicWorldStateValidation } from '~/command/validation';
import { WorldEvent } from '~/types/event';
import { withCommandType } from '~/command/withCommandType';
import { CommandType } from '~/types/intent';
import { WorkbenchShellCommandReducer, withWorkbenchShell } from '~/command/shell';
import { createRenameShellAction } from '~/worldkit/workbench/action/rename';

const PREALLOCATED_WORLD_EVENTS: WorldEvent[] = [];

const reducerCore: WorkbenchShellCommandReducer = (context, command, session, _shells, currentShell) => {
  const actor = context.world.actors[command.actor];
  const renameShell = createRenameShellAction(context, session);
  renameShell(actor, currentShell.id, command.args.newName, command.id, PREALLOCATED_WORLD_EVENTS);
  return context;
};

export const renameShellReducer: PureReducer<TransformerContext, RenameShellCommand> =
  withCommandType(CommandType.WORKBENCH_SHELL_RENAME,
    withBasicWorldStateValidation(
      withWorkbenchShell(
        reducerCore,
      ),
    ),
  );
