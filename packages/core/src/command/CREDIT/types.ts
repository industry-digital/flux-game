import { CurrencyType } from '~/types/currency';
import { ActorCommand, CommandType } from '~/types/intent';
import { ActorURN } from '~/types/taxonomy';

export type CreditCommandArgs = {
  recipient: ActorURN;
  currency: CurrencyType;
  amount: number;
};

export type CreditCommand = ActorCommand<CommandType.CREDIT, CreditCommandArgs>;
