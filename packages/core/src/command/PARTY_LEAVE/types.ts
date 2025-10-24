import { ActorCommand, CommandType } from '~/types/intent';

/**
 * PARTY_LEAVE has no arguments - the actor leaves their own party
 */
export type PartyLeaveCommandArgs = {};

export type PartyLeaveCommand = ActorCommand<
  CommandType.PARTY_LEAVE,
  PartyLeaveCommandArgs
>;
