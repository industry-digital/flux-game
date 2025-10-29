import { CommandResolver, CommandResolverContext, CommandType, Intent } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { PartyLeaveCommand } from './types';

const PARTY_TOKEN = 'party';
const LEAVE_TOKEN = 'leave';

/**
 * Syntax:
 *
 *   `party leave` or `leave`
 *
 * Examples:
 *
 *   `party leave`
 *   `leave`
 */
export const partyLeaveResolver: CommandResolver<PartyLeaveCommand> = (
  context: CommandResolverContext,
  intent: Intent,
): PartyLeaveCommand | undefined => {
  // Handle both "party leave" and just "leave"
  const isPartyLeave = intent.prefix === PARTY_TOKEN &&
                       intent.tokens.length === 1 &&
                       intent.tokens[0] === LEAVE_TOKEN;

  const isSimpleLeave = intent.prefix === LEAVE_TOKEN && intent.tokens.length === 0;

  if (!isPartyLeave && !isSimpleLeave) {
    return undefined;
  }

  const command: PartyLeaveCommand = createActorCommand({
    id: intent.id,
    type: CommandType.PARTY_LEAVE,
    actor: intent.actor,
    location: intent.location,
    session: intent.session,
    args: {},
  });

  return command;
};
