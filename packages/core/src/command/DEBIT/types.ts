import { CurrencyType } from '~/types/currency';
import { ActorCommand, CommandType } from '~/types/intent';
import { ActorURN } from '~/types/taxonomy';

export type DebitCommandArgs = {
  recipient: ActorURN;
  currency: CurrencyType;
  amount: number;
};

export type DebitCommand = ActorCommand<CommandType.DEBIT, DebitCommandArgs>;
