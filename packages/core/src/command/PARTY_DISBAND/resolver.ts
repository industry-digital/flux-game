import { CommandResolver, CommandResolverContext, CommandType, Intent } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { PartyDisbandCommand } from './types';

const PARTY_TOKEN = 'party';
const DISBAND_TOKEN = 'disband';
const NO_ARGS = Object.freeze({});

/**
 * Syntax:
 *
 *   `party disband`
 *
 * Examples:
 *
 *   `party disband`
 */
export const partyDisbandResolver: CommandResolver<PartyDisbandCommand> = (
  context: CommandResolverContext,
  intent: Intent,
): PartyDisbandCommand | undefined => {
  // Only handle "party disband" syntax
  if (intent.verb !== PARTY_TOKEN || intent.tokens.length !== 1 || intent.tokens[0] !== DISBAND_TOKEN) {
    return undefined;
  }

  const command: PartyDisbandCommand = createActorCommand({
    id: intent.id,
    type: CommandType.PARTY_DISBAND,
    actor: intent.actor,
    location: intent.location,
    session: intent.session,
    args: NO_ARGS,
  });

  return command;
};
