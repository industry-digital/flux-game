import { ActorCommand, CommandType } from '~/types/intent';

export type DoneCommandArgs = {};

export type DoneCommand = ActorCommand<CommandType.DONE, DoneCommandArgs>;
