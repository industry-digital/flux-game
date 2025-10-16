import { PureHandlerInterface, TransformerContext } from '~/types/handler';
import { AttackCommand, AttackCommandArgs } from './types';
import { attackReducer } from './reducer';
import { attackResolver } from './resolver';
import { Command, CommandType } from '~/types/intent';
import { isCommandOfType } from '~/lib/intent';

export class ATTACK implements PureHandlerInterface<TransformerContext, AttackCommand> {
  dependencies = [];
  reduce = attackReducer;
  resolve = attackResolver;
  handles = (command: Command): command is AttackCommand => {
    return isCommandOfType<CommandType.ATTACK, AttackCommandArgs>(command, CommandType.ATTACK);
  };
}
