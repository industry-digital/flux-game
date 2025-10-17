import { ActorDidCompleteCurrencyTransaction } from '~/types/event';
import { TemplateFunction } from '~/types/narrative';
import { ActorURN } from '~/types/taxonomy';
import { CurrencyType, TransactionType } from '~/types/currency';

const CURRENCY_DISPLAY_NAMES: Record<CurrencyType, string> = {
  [CurrencyType.SCRAP]: 'scrap',
};

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'decimal',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Renders narrative for currency transaction completion events
 */
export const renderCurrencyTransactionNarrative: TemplateFunction<ActorDidCompleteCurrencyTransaction, ActorURN> = (context, event, actorId) => {
  const { world } = context;
  const actor = world.actors[event.actor];
  const { transaction } = event.payload;

  if (!actor) {
    return '';
  }

  const currencyName = CURRENCY_DISPLAY_NAMES[transaction.currency];
  const formattedAmount = CURRENCY_FORMATTER.format(transaction.amount);

  // Generate narrative based on transaction type and perspective
  if (actorId === event.actor) {
    // First person perspective - the actor performing the transaction
    if (transaction.type === TransactionType.CREDIT) {
      return `You receive ${formattedAmount} ${currencyName}.`;
    }
    return `You spend ${formattedAmount} ${currencyName}.`;
  }

  // Third person perspective - other observers
  if (transaction.type === TransactionType.CREDIT) {
    return `${actor.name} receives ${formattedAmount} ${currencyName}.`;
  }

  return `${actor.name} spends ${formattedAmount} ${currencyName}.`;
};
