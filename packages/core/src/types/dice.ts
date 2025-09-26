import { AppliedModifiers } from './modifier';

export enum DieSize {
  D4 = 4,
  D6 = 6,
  D8 = 8,
  D10 = 10,
  D12 = 12,
  D20 = 20,
  D100 = 100,
}

/**
 * A RollSpecification is a string that describes a roll. It consists of a number followed by a die type.
 * For example, "2d6" means two six-sided dice are rolled.
 */
export type RollSpecification = `${number}d${DieSize}`;

export interface RollResult {
  /**
   * The roll that was made. For example, "2d6", meaning two six-sided dice were rolled.
   */
  dice: RollSpecification;
  /**
   * The modifiers that should be applied to compute the final value.
   */
  mods: AppliedModifiers;
  /**
   * The raw values of the dice that were rolled.
   */
  values: number[];
  /**
   * The sum of the raw values of the dice that were rolled.
   */
  natural: number;
  /**
   * The final result of the roll, after all modifiers have been applied.
   */
  result: number;
}
