import { SystemCommand, CommandType } from '~/types/intent';
import { ActorInput } from '~/types/entity/actor';

export type CreateActorCommand = SystemCommand<CommandType.CREATE_ACTOR, ActorInput>;
