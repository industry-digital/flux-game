import { ActorCommand, CommandType } from '~/types/intent';
import { ItemURN } from '~/types/taxonomy';

export type EquipCommandArgs = {
  item: ItemURN;
};

export type EquipCommand = ActorCommand<CommandType.EQUIP, EquipCommandArgs>;
