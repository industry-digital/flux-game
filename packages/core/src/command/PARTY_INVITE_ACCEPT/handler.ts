import { PureHandlerInterface, TransformerContext } from '~/types/handler';
import { AcceptPartyInvitationCommand, AcceptPartyInvitationCommandArgs } from './types';
import { acceptPartyInvitationReducer } from './reducer';
import { Command, CommandType } from '~/types/intent';
import { isCommandOfType } from '~/lib/intent';
import { acceptPartyInvitationResolver } from '~/command/PARTY_INVITE_ACCEPT/resolver';

export class PARTY_INVITE_ACCEPT implements PureHandlerInterface<TransformerContext, AcceptPartyInvitationCommand> {
  type = CommandType.PARTY_INVITE_ACCEPT;
  dependencies = [];
  reduce = acceptPartyInvitationReducer;
  resolve = acceptPartyInvitationResolver;
  handles = (command: Command): command is AcceptPartyInvitationCommand => {
    return isCommandOfType<CommandType.PARTY_INVITE_ACCEPT, AcceptPartyInvitationCommandArgs>(command, CommandType.PARTY_INVITE_ACCEPT);
  };
}
