import { CurrencyType } from '~/types/currency';
import { ComponentMutation, ComponentMutationOperation, StatMutation, StatMutationOperation } from '~/types/workbench';

/**
 * EXAMPLE
 *
 * > shell stats
 * [FIN 10, POW 10, RES 10]
 *
 * > shell stats add fin 2
 * [FIN 10 -> 12, -20 scrap]
 *
 * > shell stats remove fin 1
 * [FIN 12 -> 11, +10 scrap]
 *
 * > shell stats add pow 1
 * [POW 10 -> 11, -10 scrap]
 *
 * > shell diff
 * [FIN 10 -> 11]
 * [POW 10 -> 11]
 *
 * > shell commit
 * [FIN 10 -> 11]
 * [POW 10 -> 11]
 * [Scrap: -20]
 * [Shell modifications applied]
 *
 * > shell stats
 * [FIN 11, POW 11, RES 10]
 */

export const describeStatMutation = (
  mutation: StatMutation,
  cost: number,
  currency: string = CurrencyType.SCRAP,
): string => {
  return `[${mutation.stat} ${mutation.operation === StatMutationOperation.ADD ? '+' : '-'} ${mutation.amount}, -${cost} ${currency}]`;
};

export const describeComponentMutation = (
  mutation: ComponentMutation,
  componentName: string,
  powerDraw: number,
): string => {
  const isMountOperation = mutation.operation === ComponentMutationOperation.MOUNT;
  return `[${isMountOperation ? 'Mounted' : 'Unmounted'} ${componentName}, Power Draw ${isMountOperation ? '-' : '+'}${powerDraw}W]`;
};
