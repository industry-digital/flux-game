import { Command, CommandType, Taxonomy } from '~/types/domain';

export type MoveCommandArgs = {
  direction: Taxonomy.Directions;
};

export type MoveCommand = Command<CommandType.MOVE, MoveCommandArgs>;
