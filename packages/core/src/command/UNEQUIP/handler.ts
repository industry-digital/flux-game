import { PureHandlerInterface, TransformerContext } from '~/types/handler';
import { UnequipCommand, UnequipCommandArgs } from './types';
import { unequipReducer } from './reducer';
import { unequipResolver } from './resolver';
import { Command, CommandType } from '~/types/intent';
import { isCommandOfType } from '~/lib/intent';

export class UNEQUIP implements PureHandlerInterface<TransformerContext, UnequipCommand> {
  type = CommandType.UNEQUIP;
  dependencies = [];
  reduce = unequipReducer;
  resolve = unequipResolver;
  handles = (command: Command): command is UnequipCommand => {
    return isCommandOfType<CommandType.UNEQUIP, UnequipCommandArgs>(command, CommandType.UNEQUIP);
  };
}
