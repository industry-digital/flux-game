import { PureReducer, TransformerContext } from '~/types/handler';
import { AddShellAttributeCommand } from './types';
import { withBasicWorldStateValidation } from '~/command/validation';
import { createStageMutationAction } from '~/worldkit/workbench/action/stage';
import { withCommandType } from '~/command/withCommandType';
import { WorkbenchShellCommandReducer, withWorkbenchShell } from '~/command/shell';
import { CommandType } from '~/types/intent';
import { ShellMutation } from '~/types/workbench';

const PREALLOCATED_WORLD_EVENTS: any = [];

const reducerCore: WorkbenchShellCommandReducer = (context, command, session, _shells, currentShell) => {
  const { world } = context;
  const actor = world.actors[command.actor];
  const stageMutation = createStageMutationAction(context, session);
  stageMutation(actor, currentShell.id, command.args as ShellMutation, command.id, PREALLOCATED_WORLD_EVENTS);

  return context;
};

export const addShellAttributeReducer: PureReducer<TransformerContext, AddShellAttributeCommand> =
  withCommandType(CommandType.WORKBENCH_SHELL_ATTRIBUTE_ADD,
    withBasicWorldStateValidation(
      withWorkbenchShell(
        reducerCore,
      ),
    ),
  );
