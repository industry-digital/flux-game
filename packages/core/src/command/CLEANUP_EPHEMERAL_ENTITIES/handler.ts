import { PureHandlerInterface, TransformerContext } from '~/types/handler';
import { CleanupEphemeralEntitiesCommand, CleanupEphemeralEntitiesCommandArgs } from './types';
import { cleanupEphemeralEntitiesReducer } from './reducer';
import { cleanupEphemeralEntitiesResolver } from './resolver';
import { Command, CommandType } from '~/types/intent';
import { isCommandOfType } from '~/lib/intent';

export class CLEANUP_EPHEMERAL_ENTITIES implements PureHandlerInterface<TransformerContext, CleanupEphemeralEntitiesCommand> {
  type = CommandType.CLEANUP_EPHEMERAL_ENTITIES;
  dependencies = [];
  reduce = cleanupEphemeralEntitiesReducer;
  resolve = cleanupEphemeralEntitiesResolver;
  handles = (command: Command): command is CleanupEphemeralEntitiesCommand => {
    return isCommandOfType<CommandType.CLEANUP_EPHEMERAL_ENTITIES, CleanupEphemeralEntitiesCommandArgs>(command, CommandType.CLEANUP_EPHEMERAL_ENTITIES);
  };
}
