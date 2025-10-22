import { CommandResolver, CommandResolverContext, CommandType, Intent } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { UnequipCommand } from './types';

const UNEQUIP_VERB = 'unequip';

export const unequipResolver: CommandResolver<UnequipCommand> = (
  context: CommandResolverContext,
  intent: Intent,
): UnequipCommand | undefined => {
  // Check if this is a done command
  if (intent.verb !== UNEQUIP_VERB) {
    return undefined;
  }

  const weapon = context.resolveEquippedWeapon(intent);
  if (!weapon) {
    return undefined;
  }

  return createActorCommand({
    id: intent.id,
    type: CommandType.UNEQUIP,
    actor: intent.actor,
    location: intent.location,
    session: intent.session,
    args: {
      item: weapon.id,
    },
  });
};
