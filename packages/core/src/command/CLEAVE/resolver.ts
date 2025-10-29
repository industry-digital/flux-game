import { CommandResolver, CommandResolverContext, CommandType, Intent } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { CleaveCommand, CleaveCommandArgs } from './types';

const CLEAVE_VERB = 'cleave';
const NO_ARGS: Readonly<CleaveCommandArgs> = Object.freeze({});

export const cleaveResolver: CommandResolver<CleaveCommand> = (
  context: CommandResolverContext,
  intent: Intent,
): CleaveCommand | undefined => {
  const { world } = context;

  if (intent.prefix !== CLEAVE_VERB) {
    return undefined;
  }

  const attacker = world.actors[intent.actor];
  if (!attacker) {
    return undefined;
  }

  if (!attacker.location) {
    return undefined;
  }

  return createActorCommand({
    id: intent.id,
    type: CommandType.CLEAVE,
    actor: intent.actor,
    location: intent.location,
    session: intent.session,
    args: NO_ARGS,
  });
};
