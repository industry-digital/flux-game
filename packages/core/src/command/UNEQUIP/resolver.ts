import { CommandResolver, CommandResolverContext, CommandType, Intent } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { UnequipCommand } from './types';

const UNEQUIP_VERB = 'unequip';

export const unequipResolver: CommandResolver<UnequipCommand> = (
  context: CommandResolverContext,
  intent: Intent,
): UnequipCommand | undefined => {
  // Check if this is a done command
  if (intent.prefix !== UNEQUIP_VERB) {
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
    args: {
      // No item specified - reducer will find currently equipped weapon
    },
  });
};
