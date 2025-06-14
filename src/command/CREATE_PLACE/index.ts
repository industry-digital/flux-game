import { PlaceDefinition } from '~/worldkit/entity/util';
import { CommandType, Command } from '@flux';

export type CreatePlaceCommand = Command<CommandType.CREATE_PLACE, PlaceDefinition>;

// This module does not export a handler. The command is completely satisfied by the World Server.
