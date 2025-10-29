import { PureReducer, TransformerContext } from '~/types/handler';
import { AddShellAttributeCommand } from './types';
import { withBasicWorldStateValidation } from '~/command/validation';
import { withExistingWorkbenchSession } from '~/worldkit/workbench/validation';

export const addShellAttributeReducer: PureReducer<TransformerContext, AddShellAttributeCommand> = withBasicWorldStateValidation(
  withExistingWorkbenchSession(
    (context, command, session) => {
      const actor = context.world.actors[command.actor];

      // TODO: call workbench session mutation api to add the attribute

      return context;
    },
  ),
);
