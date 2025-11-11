import { PureReducer, TransformerContext } from '~/types/handler';
import { ListShellsCommand } from './types';
import { withBasicWorldStateValidation } from '~/command/validation';
import { WorldEvent } from '~/types/event';
import { createListShellsAction } from '~/worldkit/workbench/action/list';
import { withExistingWorkbenchSession } from '~/worldkit/workbench/validation';
import { withCommandType } from '~/command/withCommandType';
import { CommandType } from '~/types/intent';

const PREALLOCATED_WORLD_EVENTS: WorldEvent[] = [];

const reducerCore: PureReducer<TransformerContext, ListShellsCommand> = (context, command, session) => {
  const actor = context.world.actors[command.actor];
  const listShellsAction = createListShellsAction(context, session);
  listShellsAction(actor, command.id, PREALLOCATED_WORLD_EVENTS);
  return context;
};

export const listShellsReducer: PureReducer<TransformerContext, ListShellsCommand> =
  withCommandType(CommandType.WORKBENCH_SHELL_LIST,
    withBasicWorldStateValidation(
      withExistingWorkbenchSession(
        reducerCore,
      ),
    ),
  );
