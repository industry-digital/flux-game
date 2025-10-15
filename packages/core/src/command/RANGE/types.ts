import { ActorCommand, CommandType } from '~/types/intent';
import { ActorURN } from '~/types/taxonomy';

export type RangeCommandArgs = {
  target: ActorURN;
};

export type RangeCommand = ActorCommand<CommandType.RANGE, RangeCommandArgs>;
