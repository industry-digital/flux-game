import { CommandResolver, CommandResolverContext, CommandType, Intent } from '~/types/intent';
import { AddShellAttributeCommand } from './types';
import { createActorCommand } from '~/lib/intent';
import { ShellMutationType, StatMutationOperation } from '~/types/workbench';
import { ShellStat } from '~/types/entity/actor';
import { ErrorCode } from '~/types/error';
import { parseSafeInteger } from '~/intent/parsing';

const SHELL_PREFIX = 'shell';
const ATTRIBUTE_TOKENS = new Set(['attr', 'attribute']);
const ALLOWED_STAT_TOKENS = new Set(['pow', 'fin', 'res']);
const ADD_VERB = 'add';

/**
 * Syntax:
 *
 *   shell attribute add <attribute> <value>   (shell prefix + 4 tokens)
 */
export const addShellAttributeResolver: CommandResolver<AddShellAttributeCommand> = (
  context: CommandResolverContext,
  intent: Intent,
): AddShellAttributeCommand | undefined => {
  const { declareError } = context;

  if (intent.prefix !== SHELL_PREFIX) {
    return undefined;
  }

  if (intent.tokens.length !== 4) {
    declareError(ErrorCode.INVALID_SYNTAX, intent.id);
    return undefined;
  }

  const [attributeToken, verbToken, statToken, digitsToken] = intent.tokens;

  if (!ATTRIBUTE_TOKENS.has(attributeToken)) {
    declareError(ErrorCode.INVALID_SYNTAX, intent.id);
    return undefined;
  }

  if (verbToken !== ADD_VERB) {
    declareError(ErrorCode.INVALID_ACTION, intent.id);
    return undefined;
  }

  if (!ALLOWED_STAT_TOKENS.has(statToken)) {
    declareError(ErrorCode.INVALID_TARGET, intent.id);
    return undefined;
  }

  const amount = parseSafeInteger(digitsToken);
  if (amount === undefined) {
    declareError(ErrorCode.INVALID_AMOUNT, intent.id);
    return undefined;
  }

  return createActorCommand({
    id: intent.id,
    type: CommandType.WORKBENCH_SHELL_ATTRIBUTE_ADD,
    actor: intent.actor,
    location: intent.location,
    session: intent.session,
    args: {
      type: ShellMutationType.STAT,
      operation: StatMutationOperation.ADD,
      stat: statToken as ShellStat,
      amount,
    },
  });
};
