import { PlaceDefinition } from '~/lib/entity/util';
import { CommandType, Command } from '@flux';

export type CreatePlaceCommand = Command<CommandType.CREATE_PLACE, PlaceDefinition>;

// This module does not export a handler. It is completely satisfied by the Flux World Server.
