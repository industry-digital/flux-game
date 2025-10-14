import { ActorCommand, CommandType } from '~/types/intent';
import { PlaceURN } from '~/types/taxonomy';

export type MoveCommandArgs = {
  dest: PlaceURN;
};

export type MoveCommand = ActorCommand<CommandType.MOVE, MoveCommandArgs>;
