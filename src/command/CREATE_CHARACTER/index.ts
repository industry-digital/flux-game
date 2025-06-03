import { CharacterInput, CommandType, Command } from '@flux';

export type CreateCharacterCommand = Command<CommandType.CREATE_CHARACTER, CharacterInput>;

// This module does not export a handler. The command is completely satisfied by the World Server.
