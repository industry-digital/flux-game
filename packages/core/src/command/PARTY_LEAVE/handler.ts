import { PureHandlerInterface, TransformerContext } from '~/types/handler';
import { PartyLeaveCommand, PartyLeaveCommandArgs } from './types';
import { partyLeaveReducer } from './reducer';
import { Command, CommandType } from '~/types/intent';
import { isCommandOfType } from '~/lib/intent';
import { partyLeaveResolver } from './resolver';

export class PARTY_LEAVE implements PureHandlerInterface<TransformerContext, PartyLeaveCommand> {
  dependencies = [];
  reduce = partyLeaveReducer;
  resolve = partyLeaveResolver;
  handles = (command: Command): command is PartyLeaveCommand => {
    return isCommandOfType<CommandType.PARTY_LEAVE, PartyLeaveCommandArgs>(command, CommandType.PARTY_LEAVE);
  };
}
