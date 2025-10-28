import { CommandResolver, CommandResolverContext, CommandType, Intent } from '~/types/intent';
import { RenameShellCommand } from './types';
import { createActorCommand } from '~/lib/intent';
import { sanitize } from '~/intent/sanitization';

const SHELL_VERB = 'shell';
const RENAME_VERB = 'rename';

/**
 * Syntax:
 *   shell rename <new-name>
 *   shell rename <shell-name-or-id> [to] <new-name>
 */
export const renameShellResolver: CommandResolver<RenameShellCommand> = (
  context: CommandResolverContext,
  intent: Intent,
): RenameShellCommand | undefined => {
  if (intent.verb !== SHELL_VERB) {
    return undefined;
  }

  if (intent.tokens.length < 2) {
    return undefined;
  }

  if (intent.tokens[0] !== RENAME_VERB) {
    return undefined;
  }

  let shellNameOrId: string | undefined;
  let newName: string;

  if (intent.tokens.length === 2) {
    // Format: shell rename <new-name>
    // Rename current shell
    newName = intent.tokens[1];
  } else if (intent.tokens.length === 3) {
    // Format: shell rename <shell-name-or-id> <new-name>
    shellNameOrId = intent.tokens[1];
    newName = intent.tokens[2];
  } else if (intent.tokens.length === 4 && intent.tokens[2] === 'to') {
    // Format: shell rename <shell-name-or-id> to <new-name>
    shellNameOrId = intent.tokens[1];
    newName = intent.tokens[3];
  } else {
    return undefined;
  }

  // Sanitize the new name to ensure it's safe
  let sanitizedNewName: string;
  try {
    sanitizedNewName = sanitize(newName);
  } catch (error) {
    // Invalid shell name, reject the command
    return undefined;
  }

  return createActorCommand({
    id: intent.id,
    type: CommandType.WORKBENCH_SHELL_RENAME,
    actor: intent.actor,
    location: intent.location,
    session: intent.session,
    args: {
      newName: sanitizedNewName,
      shellNameOrId,
    },
  });
};
