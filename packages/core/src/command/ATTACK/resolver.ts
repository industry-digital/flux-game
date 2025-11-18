import { CommandResolver, CommandResolverContext, Intent, CommandType } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { AttackCommand } from './types';
import { ErrorCode } from '~/types/error';
import { resolveActorUrn } from '~/intent/resolvers';

const ATTACK_VERB = 'attack';

export const attackResolver: CommandResolver<AttackCommand> = (
  context: CommandResolverContext,
  intent: Intent,
): AttackCommand | undefined => {
  const { declareError } = context;

  // Check if this is an attack command
  if (intent.prefix !== ATTACK_VERB) {
    return undefined;
  }

  if (intent.tokens.length < 1) {
    declareError(ErrorCode.INVALID_TARGET, intent.id);
    return undefined;
  }

  const targetToken = intent.tokens[0];
  const targetActorId = resolveActorUrn(targetToken);
  if (!targetActorId) {
    return undefined;
  }

  return createActorCommand({
    id: intent.id,
    type: CommandType.ATTACK,
    actor: intent.actor,
    location: intent.location,
    session: intent.session,
    args: {
      target: targetActorId,
    },
  });
};
