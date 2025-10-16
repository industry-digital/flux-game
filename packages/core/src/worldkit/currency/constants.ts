import { CurrencyType } from '~/types/currency';

export const ALLOWED_CURRENCIES: Readonly<Set<string>> = new Set(Object.values(CurrencyType));
