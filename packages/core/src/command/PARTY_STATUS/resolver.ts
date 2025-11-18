import { CommandResolver, CommandResolverContext, CommandType, Intent } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { PartyStatusCommand, PartyStatusCommandArgs } from './types';

const PARTY_TOKEN = 'party';
const STATUS_TOKEN = 'status';
const NO_ARGS: Readonly<PartyStatusCommandArgs> = Object.freeze({});

/**
 * Syntax:
 *
 *   `party status`
 */
export const partyInspectResolver: CommandResolver<PartyStatusCommand> = (
  context: CommandResolverContext,
  intent: Intent,
): PartyStatusCommand | undefined => {
  if (intent.prefix !== PARTY_TOKEN) {
    return undefined;
  }

  if (intent.tokens.length !== 1 || intent.tokens[0] !== STATUS_TOKEN) {
    return undefined;
  }

  return createActorCommand({
    id: intent.id,
    type: CommandType.PARTY_STATUS,
    actor: intent.actor,
    location: intent.location,
    session: intent.session,
    args: NO_ARGS,
  });
};
