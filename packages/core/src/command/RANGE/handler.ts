import { PureHandlerInterface, TransformerContext } from '~/types/handler';
import { RangeCommand, RangeCommandArgs } from './types';
import { rangeReducer } from './reducer';
import { rangeIntentParser } from './parser';
import { Command, CommandType } from '~/types/intent';
import { isCommandOfType } from '~/lib/intent';

export class RANGE implements PureHandlerInterface<TransformerContext, RangeCommand> {
  dependencies = [];
  reduce = rangeReducer;
  parse = rangeIntentParser;
  handles = (command: Command): command is RangeCommand => {
    return isCommandOfType<CommandType.RANGE, RangeCommandArgs>(command, CommandType.RANGE);
  };
}
