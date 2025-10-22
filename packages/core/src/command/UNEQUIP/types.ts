import { ActorCommand, CommandType } from '~/types/intent';
import { ItemURN } from '~/types/taxonomy';

export type UnequipCommandArgs = {
  item: ItemURN;
};

export type UnequipCommand = ActorCommand<CommandType.UNEQUIP, UnequipCommandArgs>;
