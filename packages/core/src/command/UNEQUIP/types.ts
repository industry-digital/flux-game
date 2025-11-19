import { ActorCommand, CommandType } from '~/types/intent';

export type UnequipCommandArgs = {
  item?: string;
};

export type UnequipCommand = ActorCommand<CommandType.UNEQUIP, UnequipCommandArgs>;
