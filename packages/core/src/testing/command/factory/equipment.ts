import { EquipCommand, EquipCommandArgs } from '~/command/EQUIP/types';
import { UnequipCommand, UnequipCommandArgs } from '~/command/UNEQUIP/types';
import { createActorCommand } from '~/lib/intent';
import { ALICE_ID, DEFAULT_LOCATION } from '~/testing/constants';
import { CommandType } from '~/types/intent';

export type Transform<T> = (command: T) => T;

export const createEquipCommand = (
  transform?: Transform<EquipCommand>,
): EquipCommand => {
  const baseCommand: EquipCommand = createActorCommand<CommandType.EQUIP, EquipCommandArgs>({
    type: CommandType.EQUIP,
    actor: ALICE_ID,
    location: DEFAULT_LOCATION,
    args: {
      item: 'flux:item:12345',
    },
  });

  return transform ? transform(baseCommand) : baseCommand;
};

export const createUnequipCommand = (
  transform?: Transform<UnequipCommand>,
): UnequipCommand => {
  const baseCommand: UnequipCommand = createActorCommand<CommandType.UNEQUIP, UnequipCommandArgs>({
    type: CommandType.UNEQUIP,
    actor: ALICE_ID,
    location: DEFAULT_LOCATION,
    args: {
      item: 'flux:item:12345',
    },
  });

  return transform ? transform(baseCommand) : baseCommand;
};
