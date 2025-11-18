import { CommandResolver, CommandResolverContext, CommandType, Intent } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { resolveItemUrn } from '~/intent/resolvers';
import { EquipCommand } from './types';
import { ErrorCode } from '~/types/error';

const EQUIP_PREFIX = 'equip';

export const equipResolver: CommandResolver<EquipCommand> = (
  context: CommandResolverContext,
  intent: Intent,
): EquipCommand | undefined => {
  const { declareError } = context;

  if (intent.prefix !== EQUIP_PREFIX) {
    return undefined;
  }

  if (intent.tokens.length < 1) {
    declareError(ErrorCode.INVALID_TARGET, intent.id);
    return undefined;
  }

  const itemUrn = resolveItemUrn(intent.tokens[0]);
  if (!itemUrn) {
    declareError(ErrorCode.INVALID_TARGET, intent.id);
    return undefined;
  }

  return createActorCommand({
    id: intent.id,
    type: CommandType.EQUIP,
    actor: intent.actor,
    location: intent.location,
    session: intent.session,
    args: {
      item: itemUrn,
    },
  });
};
