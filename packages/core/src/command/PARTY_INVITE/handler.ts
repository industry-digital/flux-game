import { PureHandlerInterface, TransformerContext } from '~/types/handler';
import { PartyInviteCommand, PartyInviteCommandArgs } from './types';
import { partyInviteReducer } from './reducer';
import { Command, CommandType } from '~/types/intent';
import { isCommandOfType } from '~/lib/intent';
import { partyInviteResolver } from '~/command/PARTY_INVITE/resolver';

export class PARTY_INVITE implements PureHandlerInterface<TransformerContext, PartyInviteCommand> {
  dependencies = [];
  reduce = partyInviteReducer;
  resolve = partyInviteResolver;
  handles = (command: Command): command is PartyInviteCommand => {
    return isCommandOfType<CommandType.PARTY_INVITE, PartyInviteCommandArgs>(command, CommandType.PARTY_INVITE);
  };
}
