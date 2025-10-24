import { ActorCommand, CommandType } from '~/types/intent';
import { ActorURN } from '~/types/taxonomy';

export type PartyInviteCommandArgs = {
  invitee: ActorURN;
};

export type PartyInviteCommand = ActorCommand<CommandType.PARTY_INVITE, PartyInviteCommandArgs>;
