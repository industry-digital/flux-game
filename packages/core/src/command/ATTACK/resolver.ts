import { CommandResolver, CommandResolverContext, Intent, CommandType } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { AttackCommand } from './types';
import { ErrorCode } from '~/types/error';

const ATTACK_VERB = 'attack';

export const attackResolver: CommandResolver<AttackCommand> = (
  context: CommandResolverContext,
  intent: Intent,
): AttackCommand | undefined => {
  const { world } = context;

  // Check if this is an attack command
  if (intent.verb !== ATTACK_VERB) {
    return undefined;
  }

  if (intent.tokens.length < 1) {
    context.declareError(ErrorCode.INVALID_TARGET, intent.id);
    return undefined;
  }

  const targetToken = intent.tokens[0];
  const target = context.resolveActor(intent, targetToken, true);
  if (!target) {
    return undefined;
  }

  const attacker = world.actors[intent.actor];
  if (!attacker) {
    return undefined;
  }

  if (attacker.location !== target.location) {
    return undefined;
  }

  return createActorCommand({
    id: intent.id,
    type: CommandType.ATTACK,
    actor: attacker.id,
    location: attacker.location,
    session: intent.session,
    args: {
      target: target.id
    },
  });
};
