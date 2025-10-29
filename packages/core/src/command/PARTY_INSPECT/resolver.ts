import { CommandResolver, CommandResolverContext, CommandType, Intent } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { PartyInspectCommand } from './types';

const PARTY_TOKEN = 'party';
const STATUS_TOKEN = 'status';

/**
 * Syntax:
 *
 *   `party` or `party status`
 *
 * Examples:
 *
 *   `party`
 *   `party status`
 */
export const partyInspectResolver: CommandResolver<PartyInspectCommand> = (
  context: CommandResolverContext,
  intent: Intent,
): PartyInspectCommand | undefined => {
  if (intent.prefix !== PARTY_TOKEN) {
    return undefined;
  }

  // Handle both `party` (no tokens) and `party status`
  if (intent.tokens.length === 0 ||
      (intent.tokens.length === 1 && intent.tokens[0] === STATUS_TOKEN)) {

    const command: PartyInspectCommand = createActorCommand({
      id: intent.id,
      type: CommandType.PARTY_INSPECT,
      actor: intent.actor,
      location: intent.location,
      session: intent.session,
      args: {},
    });

    return command;
  }

  return undefined;
};
