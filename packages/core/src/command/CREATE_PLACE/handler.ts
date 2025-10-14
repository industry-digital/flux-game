import { PureHandlerInterface, TransformerContext } from '~/types/handler';
import { CreatePlaceCommand } from './types';
import { createPlaceCommandReducer } from './reducer';
import { SystemCommand, CommandType } from '~/types/intent';
import { isCommandOfType } from '~/lib/intent';
import { PlaceInput } from '~/types';

export class CREATE_PLACE implements PureHandlerInterface<TransformerContext, CreatePlaceCommand> {
  reduce = createPlaceCommandReducer;
  dependencies = [];
  handles = (command: SystemCommand): command is CreatePlaceCommand => {
    return isCommandOfType<CommandType.CREATE_PLACE, PlaceInput>(command, CommandType.CREATE_PLACE);
  };
}
