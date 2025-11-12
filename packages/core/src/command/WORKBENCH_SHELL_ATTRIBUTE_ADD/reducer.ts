import { PureReducer, TransformerContext } from '~/types/handler';
import { AddShellAttributeCommand } from './types';
import { withBasicWorldStateValidation } from '~/command/validation';
import { withExistingWorkbenchSession } from '~/worldkit/workbench/validation';
import { createStageMutationAction } from '~/worldkit/workbench/action/stage';
import { withCommandType } from '~/command/withCommandType';
import { CommandType } from '~/types/intent';

const PREALLOCATED_WORLD_EVENTS: any = [];

const reducerCore: PureReducer<TransformerContext, AddShellAttributeCommand> = (context, command, session) => {
  const { world } = context;
  const actor = world.actors[command.actor];
  const shell = actor.shells[actor.currentShell];
  const stageMutation = createStageMutationAction(context, session);
  stageMutation(actor, shell.id, command.args, command.id, PREALLOCATED_WORLD_EVENTS);

  return context;
};

export const addShellAttributeReducer: PureReducer<TransformerContext, AddShellAttributeCommand> =
  withCommandType(CommandType.WORKBENCH_SHELL_ATTRIBUTE_ADD,
    withBasicWorldStateValidation(
      withExistingWorkbenchSession(
        reducerCore,
      ),
    ),
  );
