import { ActorCommand, CommandType } from '~/types/intent';
import { ActorURN } from '~/types/taxonomy';

export type PartyKickCommandArgs = {
  partyOwnerId: ActorURN;
  targetId: ActorURN;
};

export type PartyKickCommand = ActorCommand<
  CommandType.PARTY_KICK,
  PartyKickCommandArgs
>;
