import { PureHandlerInterface, TransformerContext } from '~/types/handler';
import { DematerializeActorCommand } from './types';
import { dematerializeActorReducer } from './reducer';
import { SystemCommand, CommandType } from '~/types/intent';
import { isCommandOfType } from '~/lib/intent';
import { ActorURN } from '~/types/taxonomy';

export class DEMATERIALIZE_ACTOR implements PureHandlerInterface<TransformerContext, DematerializeActorCommand> {
  type = CommandType.DEMATERIALIZE_ACTOR;
  reduce = dematerializeActorReducer;
  dependencies = [];
  handles = (command: SystemCommand): command is DematerializeActorCommand => {
    return isCommandOfType<CommandType.DEMATERIALIZE_ACTOR, { actorId: ActorURN } >(
      command,
      CommandType.DEMATERIALIZE_ACTOR,
    );
  };
}
