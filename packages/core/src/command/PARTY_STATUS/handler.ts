import { PureHandlerInterface, TransformerContext } from '~/types/handler';
import { PartyStatusCommand, PartyStatusCommandArgs } from './types';
import { partyInspectReducer } from './reducer';
import { Command, CommandType } from '~/types/intent';
import { isCommandOfType } from '~/lib/intent';
import { partyInspectResolver } from './resolver';

export class PARTY_STATUS implements PureHandlerInterface<TransformerContext, PartyStatusCommand> {
  type = CommandType.PARTY_STATUS;
  dependencies = [];
  reduce = partyInspectReducer;
  resolve = partyInspectResolver;
  handles = (command: Command): command is PartyStatusCommand => {
    return isCommandOfType<CommandType.PARTY_STATUS, PartyStatusCommandArgs>(command, CommandType.PARTY_STATUS);
  };
}
