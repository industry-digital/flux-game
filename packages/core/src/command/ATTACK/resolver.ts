import { CommandResolver, CommandResolverContext, Intent, CommandType } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { AttackCommand } from './types';

const ATTACK_VERB = 'attack';

export const attackResolver: CommandResolver<AttackCommand> = (
  context: CommandResolverContext,
  intent: Intent,
): AttackCommand | undefined => {
  const { world, resolveActor } = context;

  // Check if this is an attack command
  if (intent.verb !== ATTACK_VERB) {
    return undefined;
  }

  const target = resolveActor(intent);
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
    actor: intent.actor,
    location: intent.location,
    session: intent.session,
    args: {
      target: target.id
    },
  });
};
