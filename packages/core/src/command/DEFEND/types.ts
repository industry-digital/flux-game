import { ActorCommand, CommandType } from '~/types/intent';

export type DefendCommandArgs = {
  autoDone?: boolean; // Whether this is an auto-generated defend to end turn
};

export type DefendCommand = ActorCommand<CommandType.DEFEND, DefendCommandArgs>;
