import { ActorCommand, CommandType } from '~/types/intent';
import { SessionURN } from '~/types/taxonomy';

export type UseWorkbenchCommandArgs = {
  sessionId?: SessionURN;
};

export type UseWorkbenchCommand = ActorCommand<CommandType.WORKBENCH_USE, UseWorkbenchCommandArgs>;
