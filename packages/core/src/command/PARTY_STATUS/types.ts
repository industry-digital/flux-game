import { ActorCommand, CommandType } from '~/types/intent';

/**
 * PARTY_INSPECT has no arguments - it inspects the actor's own party
 */
export type PartyStatusCommandArgs = {};

export type PartyStatusCommand = ActorCommand<CommandType.PARTY_STATUS, PartyStatusCommandArgs>;
