import { PureHandlerInterface, TransformerContext } from '~/types/handler';
import { MaterializeActorCommand } from './types';
import { materializeActorReducer } from './reducer';
import { SystemCommand, CommandType } from '~/types/intent';
import { isCommandOfType } from '~/lib/intent';
import { ActorURN } from '~/types/taxonomy';

export class MATERIALIZE_ACTOR implements PureHandlerInterface<TransformerContext, MaterializeActorCommand> {
  reduce = materializeActorReducer;
  dependencies = [];
  handles = (command: SystemCommand): command is MaterializeActorCommand => {
    return isCommandOfType<CommandType.MATERIALIZE_ACTOR, { actorId: ActorURN }>(
      command,
      CommandType.MATERIALIZE_ACTOR,
    );
  };
}
