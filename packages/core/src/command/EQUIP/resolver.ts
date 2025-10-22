import { CommandResolver, CommandResolverContext, CommandType, Intent } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { EquipCommand } from './types';

const EQUIP_VERB = 'equip';

export const equipResolver: CommandResolver<EquipCommand> = (
  context: CommandResolverContext,
  intent: Intent,
): EquipCommand | undefined => {
  // Check if this is a done command
  if (intent.verb !== EQUIP_VERB) {
    return undefined;
  }

  const item = context.resolveItem(intent);
  if (!item) {
    return undefined;
  }

  return createActorCommand({
    id: intent.id,
    type: CommandType.EQUIP,
    actor: intent.actor,
    location: intent.location,
    session: intent.session,
    args: {
      item: item.id,
    },
  });
};
