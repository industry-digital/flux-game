import { IntentParser, IntentParserContext, Intent } from '~/types/handler';
import { CommandType } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { DebitCommand } from './types';
import { CurrencyType, WellKnownActor } from '~/types';
import { ALLOWED_CURRENCIES } from '~/worldkit/currency';

const DEBIT_VERB = '@debit';

/**
 * @example
 * `@debit flux:actor:alice gold 100 --memo="Payment for services"`
 */
export const debitIntentParser: IntentParser<DebitCommand> = (
  context: IntentParserContext,
  intent: Intent,
): DebitCommand | undefined => {
  // Check if this is a debit command
  if (intent.verb !== DEBIT_VERB) {
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
