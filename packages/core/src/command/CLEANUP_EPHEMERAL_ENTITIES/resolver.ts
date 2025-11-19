import { CommandResolver, CommandResolverContext, CommandType, Intent } from '~/types/intent';
import { createSystemCommand } from '~/lib/intent';
import { CleanupEphemeralEntitiesCommand, CleanupEphemeralEntitiesCommandArgs } from './types';

const CLEANUP_EPHEMERAL_ENTITIES_VERB = 'cleanup';
const NO_ARGS: Readonly<CleanupEphemeralEntitiesCommandArgs> = Object.freeze({});

export const cleanupEphemeralEntitiesResolver: CommandResolver<CleanupEphemeralEntitiesCommand> = (
  context: CommandResolverContext,
  intent: Intent,
): CleanupEphemeralEntitiesCommand | undefined => {
  // Check if this is a done command
  if (intent.prefix !== CLEANUP_EPHEMERAL_ENTITIES_VERB) {
    return undefined;
  }

  return createSystemCommand({
    id: intent.id,
    type: CommandType.CLEANUP_EPHEMERAL_ENTITIES,
    location: intent.location,
    session: intent.session,
    args: NO_ARGS,
  });
};
