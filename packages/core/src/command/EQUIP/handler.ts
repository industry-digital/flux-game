import { PureHandlerInterface, TransformerContext } from '~/types/handler';
import { EquipCommand, EquipCommandArgs } from './types';
import { equipReducer } from './reducer';
import { equipResolver } from './resolver';
import { Command, CommandType } from '~/types/intent';
import { isCommandOfType } from '~/lib/intent';

export class EQUIP implements PureHandlerInterface<TransformerContext, EquipCommand> {
  dependencies = [];
  reduce = equipReducer;
  resolve = equipResolver;
  handles = (command: Command): command is EquipCommand => {
    return isCommandOfType<CommandType.EQUIP, EquipCommandArgs>(command, CommandType.EQUIP);
  };
}
