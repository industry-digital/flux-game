import { EquipCommand, EquipCommandArgs } from '~/command/EQUIP/types';
import { createActorCommand } from '~/lib/intent';
import { ALICE_ID, DEFAULT_LOCATION } from '~/testing/constants';
import { CommandType } from '~/types/intent';

export type Transform<T extends EquipCommand> = (command: T) => T;

export const createEquipCommand = (
  transform?: Transform<EquipCommand>,
): EquipCommand => {
  const baseCommand: EquipCommand = createActorCommand<CommandType.EQUIP, EquipCommandArgs>({
    id: 'test-command-id',
    type: CommandType.EQUIP,
    actor: ALICE_ID,
    location: DEFAULT_LOCATION,
    args: {
      item: 'flux:item:12345',
    },
  });

  return transform ? transform(baseCommand) : baseCommand;
};
