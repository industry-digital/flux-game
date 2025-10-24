import { CommandResolver, CommandResolverContext, CommandType, Intent } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { EquipCommand } from './types';
import { ErrorCode } from '~/types/error';

const EQUIP_VERB = 'equip';

export const equipResolver: CommandResolver<EquipCommand> = (
  context: CommandResolverContext,
  intent: Intent,
): EquipCommand | undefined => {
  if (intent.verb !== EQUIP_VERB) {
    return undefined;
  }

  if (intent.tokens.length < 1) {
    context.declareError(ErrorCode.INVALID_TARGET, intent.id);
    return undefined;
  }

  const itemToken = intent.tokens[0];
  const item = context.resolveItem(intent, itemToken);
  if (!item) {
    context.declareError(ErrorCode.INVALID_TARGET, intent.id);
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
