import { CommandResolver, CommandResolverContext, Intent } from '~/types/intent';
import { CommandType } from '~/types/intent';
import { createActorCommand } from '~/lib/intent';
import { CreditCommand } from './types';
import { CurrencyType, WellKnownActor } from '~/types';
import { ErrorCode } from '~/types/error';
import { resolveActorUrn } from '~/intent/resolvers';
import { parseSafeInteger } from '~/intent/parsing';

const CREDIT_VERB = '@credit';

/**
 * @example
 * `@credit flux:actor:alice gold 100 --memo="Gift from the queen"`
 */
export const creditResolver: CommandResolver<CreditCommand> = (
  context: CommandResolverContext,
  intent: Intent,
): CreditCommand | undefined => {
  const { declareError } = context;

  // Check if this is a done command
  if (intent.prefix !== CREDIT_VERB) {
    return undefined;
  }

  if (intent.tokens.length !== 3) {
    declareError(ErrorCode.INVALID_SYNTAX, intent.id);
    return undefined;
  }

  const [recipient, currencyType, amountString] = intent.tokens;
  // Pure syntax-only resolution - no world validation
  const recipientId = resolveActorUrn(recipient);
  if (!recipientId) {
    declareError(ErrorCode.INVALID_TARGET, intent.id);
    return undefined;
  }

  const amount = parseSafeInteger(amountString);
  if (amount === undefined) {
    declareError(ErrorCode.INVALID_AMOUNT, intent.id);
    return undefined;
  }

  return createActorCommand({
    id: intent.id,
    type: CommandType.CREDIT,
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
