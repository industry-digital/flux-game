import { ActorCommand, CommandType } from '~/types/intent';

/**
 * PARTY_INSPECT has no arguments - it inspects the actor's own party
 */
export type PartyInspectCommandArgs = {};

export type PartyInspectCommand = ActorCommand<
  CommandType.PARTY_INSPECT,
  PartyInspectCommandArgs
>;
