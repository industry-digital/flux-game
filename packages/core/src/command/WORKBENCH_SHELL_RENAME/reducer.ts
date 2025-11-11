import { PureReducer, TransformerContext } from '~/types/handler';
import { RenameShellCommand } from './types';
import { withBasicWorldStateValidation } from '~/command/validation';
import { WorldEvent } from '~/types/event';
import { createListShellsAction } from '~/worldkit/workbench/action/list';
import { withExistingWorkbenchSession } from '~/worldkit/workbench/validation';
import { withCommandType } from '~/command/withCommandType';
import { CommandType } from '~/types/intent';

const PREALLOCATED_WORLD_EVENTS: WorldEvent[] = [];

const reducerCore: PureReducer<TransformerContext, RenameShellCommand> = (context, command, session) => {
  const actor = context.world.actors[command.actor];
  const listShellsAction = createListShellsAction(context, session);
  listShellsAction(actor, command.id, PREALLOCATED_WORLD_EVENTS);
  return context;
};

export const renameShellReducer: PureReducer<TransformerContext, RenameShellCommand> =
  withCommandType(CommandType.WORKBENCH_SHELL_RENAME,
    withBasicWorldStateValidation(
      withExistingWorkbenchSession(
        reducerCore,
      ),
    ),
  );
