import { SystemCommand, CommandType } from '~/types/intent';
import { ActorURN } from '~/types/taxonomy';

export type DematerializeActorCommand = SystemCommand<CommandType.DEMATERIALIZE_ACTOR, {
  actorId: ActorURN;
}>;
