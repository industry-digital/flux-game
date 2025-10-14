import { PureHandlerInterface, TransformerContext } from '~/types/handler';
import { MutateResourcesCommand, MutateResourcesArgs } from './types';
import { mutateResourcesReducer } from './reducer';
import { Command, CommandType } from '~/types/intent';
import { isCommandOfType } from '~/lib/intent';

export class MUTATE_RESOURCES implements PureHandlerInterface<TransformerContext, MutateResourcesCommand> {
  reduce = mutateResourcesReducer;
  dependencies = [];
  handles = (command: Command): command is MutateResourcesCommand => {
    return isCommandOfType<CommandType.MUTATE_RESOURCES, MutateResourcesArgs>(command, CommandType.MUTATE_RESOURCES);
  };
}
