import { SystemCommand, CommandType } from '~/types/intent';
import { PlaceInput } from '~/types';

export type CreatePlaceCommand = SystemCommand<CommandType.CREATE_PLACE, PlaceInput>;
