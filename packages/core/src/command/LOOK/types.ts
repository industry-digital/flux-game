import { ActorCommand, CommandType } from '~/types/intent';
import { ActorURN, ItemURN, PlaceURN } from '~/types/taxonomy';

export type LookCommandArgs = { target: ActorURN | PlaceURN | ItemURN };

export type LookCommand = ActorCommand<CommandType.LOOK, LookCommandArgs>;
