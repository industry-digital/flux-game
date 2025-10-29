import { PureReducer, TransformerContext } from '~/types/handler';
import { AssessShellStatusCommand } from './types';
import { withBasicWorldStateValidation } from '~/command/validation';
import { WorldEvent } from '~/types/event';
import { createGetShellStatusAction } from '~/worldkit/workbench/action/status';
import { withExistingWorkbenchSession } from '~/worldkit/workbench/validation';

const PREALLOCATED_WORLD_EVENTS: WorldEvent[] = [];

export const shellStatusReducer: PureReducer<TransformerContext, AssessShellStatusCommand> = withBasicWorldStateValidation(
  withExistingWorkbenchSession(
    (context, command, session) => {
      const actor = context.world.actors[command.actor];
      const getShellStatusAction = createGetShellStatusAction(context, session);
      getShellStatusAction(actor, command.id, PREALLOCATED_WORLD_EVENTS);
      return context;
    },
  ),
);
