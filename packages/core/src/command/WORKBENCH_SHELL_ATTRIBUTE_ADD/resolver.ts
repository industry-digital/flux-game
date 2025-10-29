import { CommandResolver, CommandResolverContext, CommandType, Intent } from '~/types/intent';
import { AddShellAttributeCommand } from './types';
import { createActorCommand } from '~/lib/intent';
import { ShellMutationType, StatMutationOperation } from '~/types/workbench';
import { ShellStat } from '~/types/entity/actor';
import { ErrorCode } from '~/types/error';
import { MAX_STAT_VALUE } from '~/worldkit/entity/actor/stats';

const SHELL_PREFIX = 'shell';
const ATTRIBUTE_TOKENS = new Set(['attr', 'attribute']);
const ALLOWED_STAT_TOKENS = new Set(['pow', 'fin', 'res']);
const ADD_VERB = 'add';
const DIGITS = /^\d+$/;

/**
 * Syntax:
 *
 *   shell attribute add <attribute> <value>   (shell prefix + 4 tokens)
 */
export const addShellAttributeResolver: CommandResolver<AddShellAttributeCommand> = (
  context: CommandResolverContext,
  intent: Intent,
): AddShellAttributeCommand | undefined => {
  if (intent.prefix !== SHELL_PREFIX) {
    return undefined;
  }

  if (intent.tokens.length !== 4) {
    context.declareError(ErrorCode.INVALID_SYNTAX, intent.id);
    return undefined;
  }

  const [attributeToken, verbToken, statToken, digitsToken] = intent.tokens;

  if (!ATTRIBUTE_TOKENS.has(attributeToken)) {
    context.declareError(ErrorCode.INVALID_SYNTAX, intent.id);
    return undefined;
  }

  if (verbToken !== ADD_VERB) {
    context.declareError(ErrorCode.INVALID_ACTION, intent.id);
    return undefined;
  }

  if (!ALLOWED_STAT_TOKENS.has(statToken)) {
    context.declareError(ErrorCode.INVALID_TARGET, intent.id);
    return undefined;
  }

  if (!DIGITS.test(digitsToken)) {
    context.declareError(ErrorCode.INVALID_AMOUNT, intent.id);
    return undefined;
  }

  const amount = parseInt(digitsToken, 10);

  // Security: Validate numeric bounds - no stat modification can exceed MAX_STAT_VALUE
  if (isNaN(amount) || amount < 0 || amount > MAX_STAT_VALUE) {
    context.declareError(ErrorCode.INVALID_AMOUNT, intent.id);
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
