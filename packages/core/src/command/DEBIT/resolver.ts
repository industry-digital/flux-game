import { CommandResolver, CommandResolverContext, CommandType, Intent } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { DebitCommand } from './types';
import { ActorURN, CurrencyType, WellKnownActor } from '~/types';
import { ALLOWED_CURRENCIES } from '~/worldkit/currency';
import { ErrorCode } from '~/types/error';

const DEBIT_VERB = '@debit';

/**
 * @example
 * `@debit flux:actor:alice gold 100 --memo="Payment for services"`
 */
export const debitResolver: CommandResolver<DebitCommand> = (
  context: CommandResolverContext,
  intent: Intent,
): DebitCommand | undefined => {
  // Check if this is a debit command
  if (intent.prefix !== DEBIT_VERB) {
    return undefined;
  }

  if (intent.tokens.length !== 3) {
    context.declareError(ErrorCode.INVALID_SYNTAX, intent.id);
    return undefined;
  }

  const [recipientId, currencyType, amountString] = intent.tokens;
  // This command requires an exact Actor ID
  const recipient = context.world.actors[recipientId as ActorURN];
  if (!recipient) {
    context.declareError(ErrorCode.INVALID_TARGET, intent.id);
    return undefined;
  }

  if (!ALLOWED_CURRENCIES.has(currencyType)) {
    context.declareError(ErrorCode.INVALID_CURRENCY, intent.id);
    return undefined;
  }

  const amount = parseInt(amountString, 10);
  if (isNaN(amount) || amount < Number.MIN_SAFE_INTEGER || amount > Number.MAX_SAFE_INTEGER) {
    context.declareError(ErrorCode.INVALID_AMOUNT, intent.id);
    return undefined;
  }

  return createActorCommand({
    id: intent.id,
    type: CommandType.DEBIT,
    actor: WellKnownActor.SYSTEM,
    location: intent.location,
    session: intent.session,
    args: {
      recipient: recipient.id,
      currency: currencyType as CurrencyType,
      amount,
    },
  });
};
