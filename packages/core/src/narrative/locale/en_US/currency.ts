import { ActorDidCompleteCurrencyTransaction } from '~/types/event';
import { TemplateFunction } from '~/types/narrative';
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
export const narrateActorDidCompleteCurrencyTransaction: TemplateFunction<ActorDidCompleteCurrencyTransaction> = (context, event) => {
  const { world } = context;
  const actor = world.actors[event.actor];
  const { transaction } = event.payload;

  if (!actor) {
    return { self: '', observer: '' };
  }

  const currencyName = CURRENCY_DISPLAY_NAMES[transaction.currency];
  const formattedAmount = CURRENCY_FORMATTER.format(transaction.amount);

  const isCredit = transaction.type === TransactionType.CREDIT;

  return {
    self: isCredit
      ? `You receive ${formattedAmount} ${currencyName}.`
      : `You spend ${formattedAmount} ${currencyName}.`,
    observer: isCredit
      ? `${actor.name} receives ${formattedAmount} ${currencyName}.`
      : `${actor.name} spends ${formattedAmount} ${currencyName}.`
  };
};
