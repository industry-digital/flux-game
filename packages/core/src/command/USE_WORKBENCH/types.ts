import { ActorCommand, CommandType } from '~/types/intent';
import { SessionURN } from '~/types/taxonomy';

export type UseWorkbenchCommandArgs = {
  sessionId?: SessionURN;
};

export type UseWorkbenchCommand = ActorCommand<CommandType.USE_WORKBENCH, UseWorkbenchCommandArgs>;
