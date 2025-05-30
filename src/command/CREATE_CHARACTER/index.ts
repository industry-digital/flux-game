import { CharacterInput, CommandType, Command } from '@flux';

export type CreateCharacterCommand = Command<CommandType.CREATE_CHARACTER, CharacterInput>;

// This module does not export a handler. It is completely satisfied by the Flux World Server.
