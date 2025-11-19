import { CommandResolver, CommandResolverContext, CommandType, Intent } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { UnequipCommand } from './types';
import { ErrorCode } from '~/types/error';

const UNEQUIP_VERB = 'unequip';
const NO_ARGS = Object.freeze({});

/**
 * Syntax:
 *
 *   `unequip gun`
 *   `unequip my gun`
 */
export const unequipResolver: CommandResolver<UnequipCommand> = (
  context: CommandResolverContext,
  intent: Intent,
): UnequipCommand | undefined => {
  const { declareError } = context;
  // Check if this is a done command
  if (intent.prefix !== UNEQUIP_VERB) {
    return undefined;
  }

  if (intent.tokens.length < 1) {
    declareError(ErrorCode.INVALID_TARGET, intent.id);
    return undefined;
  }

  // UNEQUIP without arguments unequips the currently equipped weapon
  // The reducer will handle finding and validating the equipped weapon
  return createActorCommand({
    id: intent.id,
    type: CommandType.UNEQUIP,
    actor: intent.actor,
    location: intent.location,
    session: intent.session,
    args: NO_ARGS,
  });
};
