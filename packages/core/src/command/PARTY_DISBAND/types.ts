import { ActorCommand, CommandType } from '~/types/intent';

/**
 * PARTY_DISBAND has no arguments - the actor disbands their own party
 * Only the party owner can disband the party
 */
export type PartyDisbandCommandArgs = {};

export type PartyDisbandCommand = ActorCommand<
  CommandType.PARTY_DISBAND,
  PartyDisbandCommandArgs
>;
