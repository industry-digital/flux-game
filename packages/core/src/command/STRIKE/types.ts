import { ActorCommand, CommandType } from '~/types/intent';
import { ActorURN } from '~/types/taxonomy';

export type StrikeCommandArgs = {
  target?: ActorURN; // Optional target - can use current target if not specified
};

export type StrikeCommand = ActorCommand<CommandType.STRIKE, StrikeCommandArgs>;
