import { CommandResolver, CommandResolverContext, CommandType, Intent } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { DebitCommand } from './types';
import { CurrencyType, WellKnownActor } from '~/types';
import { ErrorCode } from '~/types/error';
import { resolveActorUrn } from '~/intent/resolvers';
import { parseSafeInteger } from '~/intent/parsing';

const DEBIT_VERB = '@debit';

/**
 * @example
 * `@debit flux:actor:alice gold 100 --memo="Payment for services"`
 */
export const debitResolver: CommandResolver<DebitCommand> = (
  context: CommandResolverContext,
  intent: Intent,
): DebitCommand | undefined => {
  const { declareError } = context;

  // Check if this is a debit command
  if (intent.prefix !== DEBIT_VERB) {
    return undefined;
  }

  if (intent.tokens.length !== 3) {
    declareError(ErrorCode.INVALID_SYNTAX, intent.id);
    return undefined;
  }

  const [recipient, currencyType, amountString] = intent.tokens;
  // Pure syntax-only resolution - no world validation
  const recipientId = resolveActorUrn(recipient);
  // Note: recipientId will always be valid since resolveActorUrn is pure
  // World validation (actor existence) happens in the reducer

  const amount = parseSafeInteger(amountString);
  if (amount === undefined) {
    declareError(ErrorCode.INVALID_AMOUNT, intent.id);
    return undefined;
  }

  return createActorCommand({
    id: intent.id,
    type: CommandType.DEBIT,
    actor: WellKnownActor.SYSTEM,
    location: intent.location,
    session: intent.session,
    args: {
      recipient: recipientId,
      currency: currencyType as CurrencyType,
      amount,
    },
  });
};
