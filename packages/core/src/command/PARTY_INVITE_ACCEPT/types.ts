import { ActorCommand, CommandType } from '~/types/intent';
import { ActorURN } from '~/types/taxonomy';

export type AcceptPartyInvitationCommandArgs = {
  partyOwnerId: ActorURN;
};

export type AcceptPartyInvitationCommand = ActorCommand<
  CommandType.PARTY_INVITE_ACCEPT,
  AcceptPartyInvitationCommandArgs
>;
