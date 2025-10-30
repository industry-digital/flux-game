import { PureReducer, TransformerContext } from '~/types/handler';
import { AddShellAttributeCommand } from './types';
import { withBasicWorldStateValidation } from '~/command/validation';
import { withExistingWorkbenchSession } from '~/worldkit/workbench/validation';
import { createStageMutationAction } from '~/worldkit/workbench/action/stage';

const PREALLOCATED_WORLD_EVENTS: any = [];

export const addShellAttributeReducer: PureReducer<TransformerContext, AddShellAttributeCommand> = withBasicWorldStateValidation(
  withExistingWorkbenchSession(
    (context, command, session) => {
      const actor = context.world.actors[command.actor];
      const shell = actor.shells[actor.currentShell];

      const stageMutation = createStageMutationAction(context, session);
      stageMutation(actor, shell.id, command.args, command.id, PREALLOCATED_WORLD_EVENTS);

      return context;
    },
  ),
);
