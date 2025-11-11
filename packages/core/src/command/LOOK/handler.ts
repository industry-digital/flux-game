import { PureHandlerInterface, TransformerContext } from '~/types/handler';
import { LookCommand } from './types';
import { lookReducer } from './reducer';
import { lookResolver } from './resolver';
import { CommandType } from '~/types/intent';

export class LOOK implements PureHandlerInterface<TransformerContext, LookCommand> {
  type = CommandType.LOOK;
  reduce = lookReducer;
  resolve = lookResolver;
  dependencies = [];
}
