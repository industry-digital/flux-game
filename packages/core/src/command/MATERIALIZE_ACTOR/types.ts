import { SystemCommand, CommandType } from '~/types/intent';
import { ActorURN } from '~/types/taxonomy';

export type MaterializeActorCommand = SystemCommand<CommandType.MATERIALIZE_ACTOR, {
  actorId: ActorURN;
}>;
