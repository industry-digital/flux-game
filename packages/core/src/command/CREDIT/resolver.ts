import { CommandResolver, CommandResolverContext, Intent } from '~/types/intent';
import { CommandType } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { CreditCommand } from './types';
import { CurrencyType, WellKnownActor } from '~/types';
import { ALLOWED_CURRENCIES } from '~/worldkit/currency';

const CREDIT_VERB = '@credit';

/**
 * @example
 * `@credit flux:actor:alice gold 100 --memo="Gift from the queen"`
 */
export const creditResolver: CommandResolver<CreditCommand> = (
  context: CommandResolverContext,
  intent: Intent,
): CreditCommand | undefined => {
  // Check if this is a done command
  if (intent.verb !== CREDIT_VERB) {
    return undefined;
  }

  if (intent.tokens.length !== 3) {
    return undefined;
  }

  const recipient = context.resolveActor(intent);
  if (!recipient) {
    return undefined;
  }

  const [, currencyType, amountString] = intent.tokens;
  if (!ALLOWED_CURRENCIES.has(currencyType)) {
    return undefined;
  }

  const amount = parseInt(amountString, 10);
  if (isNaN(amount) || amount < Number.MIN_SAFE_INTEGER || amount > Number.MAX_SAFE_INTEGER) {
    return undefined;
  }

  return createActorCommand({
    id: intent.id,
    type: CommandType.CREDIT,
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
