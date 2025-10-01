import { ActorURN } from '~/types/taxonomy';

export enum CurrencyType {
  SCRAP = 'scrap',
}

export enum TransactionType {
  /**
   * DEBIT is a kind of transaction that *decreases* an actor's currency balance
   */
  DEBIT = 'debit',

  /**
   * CREDIT is a kind of transaction that *increases* an actor's currency balance
   */
  CREDIT = 'credit',
}

export type CurrencyTransactionInput = {
  id?: string;
  ts?: number;
  trace: string;
  actorId: ActorURN;
  currency: CurrencyType;
  type: TransactionType;
  amount: number;
}

export type CurrencyTransaction = Omit<CurrencyTransactionInput, 'id' | 'ts' | 'trace'> & {
  id: string;
  ts: number;
  trace: string;
};
