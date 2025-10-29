import { CommandResolver, CommandResolverContext, Intent } from '~/types/intent';
import { CommandType } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { CreditCommand } from './types';
import { ActorURN, CurrencyType, WellKnownActor } from '~/types';
import { ALLOWED_CURRENCIES } from '~/worldkit/currency';
import { ErrorCode } from '~/types/error';

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
  if (intent.prefix !== CREDIT_VERB) {
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
