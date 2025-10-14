import { ActorCommand, CommandType } from '~/types/intent';
import { ActorURN } from '~/types/taxonomy';

export type TargetCommandArgs = {
  target: ActorURN;
};

export type TargetCommand = ActorCommand<CommandType.TARGET, TargetCommandArgs>;
