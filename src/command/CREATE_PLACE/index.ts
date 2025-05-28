import { PlaceDefinition } from '~/lib/entity/util';
import { CreatePlaceCommandReducer } from './reducer';
import {
  CommandType,
  Command,
  isCommandOfType,
  TransformerInterface,
} from '@flux';

export type CreatePlaceCommandArgs = PlaceDefinition ;

export type CreatePlaceCommand = Command<CommandType.CREATE_PLACE, CreatePlaceCommandArgs>;

/**
 * Handler for MOVE commands
 * Processes an actor's movement in the world
 */
export class MOVE implements TransformerInterface<
  Command<CommandType.CREATE_PLACE, CreatePlaceCommandArgs>
> {
  reduce = CreatePlaceCommandReducer;
  dependencies = [];
  handles = (input: Command): input is Command<CommandType.CREATE_PLACE, CreatePlaceCommandArgs> => {
    return isCommandOfType(input, CommandType.CREATE_PLACE);
  };
}
