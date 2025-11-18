import { ActorCommand, CommandType } from '~/types/intent';

export type LookCommandArgs = { target: string };

export type LookCommand = ActorCommand<CommandType.LOOK, LookCommandArgs>;
