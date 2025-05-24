import { Modifiers } from './modifier';

export enum DieType {
  D4 = 'd4',
  D6 = 'd6',
  D8 = 'd8',
  D10 = 'd10',
  D12 = 'd12',
  D20 = 'd20',
  D100 = 'd100',
}

/**
 * A RollSpecification is a string that describes a roll. It consists of a number followed by a die type.
 * For example, "2d6" means two six-sided dice are rolled.
 */
export type RollSpecification = `${number}${DieType}`;

export interface RollResult {
  /**
   * The roll that was made. For example, "2d6", meaning two six-sided dice were rolled.
   */
  dice: RollSpecification;
  /**
   * The modifiers that should be applied to compute the final value.
   */
  modifiers: Modifiers;
  /**
   * The raw result of the roll, before any modifiers are applied.
   */
  natural: number;
  /**
   * The final result of the roll, after all modifiers have been applied.
   */
  result: number;
}
