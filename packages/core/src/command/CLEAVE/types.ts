import { ActorCommand, CommandType } from '~/types/intent';

export type CleaveCommandArgs = {
  // CLEAVE has no arguments - it automatically targets all enemies at optimal range
};

export type CleaveCommand = ActorCommand<CommandType.CLEAVE, CleaveCommandArgs>;
