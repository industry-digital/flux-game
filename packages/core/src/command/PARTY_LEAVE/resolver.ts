import { CommandResolver, CommandResolverContext, CommandType, Intent } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { PartyLeaveCommand, PartyLeaveCommandArgs } from './types';

const PARTY_TOKEN = 'party';
const LEAVE_TOKEN = 'leave';
const NO_ARGS: Readonly<PartyLeaveCommandArgs> = Object.freeze({});

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
  if (intent.prefix !== PARTY_TOKEN) {
    return undefined;
  }

  if (intent.tokens.length !== 1 || intent.tokens[0] !== LEAVE_TOKEN) {
    return undefined;
  }

  return createActorCommand({
    id: intent.id,
    type: CommandType.PARTY_LEAVE,
    actor: intent.actor,
    location: intent.location,
    session: intent.session,
    args: NO_ARGS,
  });
};
