import { PureHandlerInterface, TransformerContext } from '~/types/handler';
import { RejectPartyInvitationCommand, RejectPartyInvitationCommandArgs } from './types';
import { rejectPartyInvitationReducer } from './reducer';
import { Command, CommandType } from '~/types/intent';
import { isCommandOfType } from '~/lib/intent';
import { rejectPartyInvitationResolver } from './resolver';

export class PARTY_INVITE_REJECT implements PureHandlerInterface<TransformerContext, RejectPartyInvitationCommand> {
  type = CommandType.PARTY_INVITE_REJECT;
  dependencies = [];
  reduce = rejectPartyInvitationReducer;
  resolve = rejectPartyInvitationResolver;
  handles = (command: Command): command is RejectPartyInvitationCommand => {
    return isCommandOfType<CommandType.PARTY_INVITE_REJECT, RejectPartyInvitationCommandArgs>(command, CommandType.PARTY_INVITE_REJECT);
  };
}
