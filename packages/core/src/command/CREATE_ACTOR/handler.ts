import { PureHandlerInterface, TransformerContext } from '~/types/handler';
import { CreateActorCommand } from './types';
import { createActorCommandReducer } from './reducer';
import { SystemCommand, CommandType } from '~/types/intent';
import { isCommandOfType } from '~/lib/intent';
import { ActorInput } from '~/types/entity/actor';

export class CREATE_ACTOR implements PureHandlerInterface<TransformerContext, CreateActorCommand> {
  type = CommandType.CREATE_ACTOR;
  reduce = createActorCommandReducer;
  dependencies = [];
  handles = (command: SystemCommand): command is CreateActorCommand => {
    return isCommandOfType<CommandType.CREATE_ACTOR, ActorInput>(command, CommandType.CREATE_ACTOR);
  };
}
