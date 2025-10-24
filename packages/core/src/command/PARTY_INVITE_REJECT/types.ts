import { ActorCommand, CommandType } from '~/types/intent';
import { ActorURN } from '~/types/taxonomy';

export type RejectPartyInvitationCommandArgs = {
  partyOwnerId: ActorURN;
};

export type RejectPartyInvitationCommand = ActorCommand<
  CommandType.PARTY_INVITE_REJECT,
  RejectPartyInvitationCommandArgs
>;
