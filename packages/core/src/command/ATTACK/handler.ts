import { PureHandlerInterface, TransformerContext } from '~/types/handler';
import { AttackCommand, AttackCommandArgs } from './types';
import { attackReducer } from './reducer';
import { attackIntentParser } from './parser';
import { Command, CommandType } from '~/types/intent';
import { isCommandOfType } from '~/lib/intent';

export class ATTACK implements PureHandlerInterface<TransformerContext, AttackCommand> {
  dependencies = [];
  reduce = attackReducer;
  parse = attackIntentParser;
  handles = (command: Command): command is AttackCommand => {
    return isCommandOfType<CommandType.ATTACK, AttackCommandArgs>(command, CommandType.ATTACK);
  };
}
