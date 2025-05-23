import { Duration } from '@flux/world/time';
import { Taxonomy } from '@flux/taxonomy';

export enum DieType {
  D4 = 'd4',
  D6 = 'd6',
  D8 = 'd8',
  D10 = 'd10',
  D12 = 'd12',
  D20 = 'd20',
  D100 = 'd100',
}

export type RollSpecification = `${number}${DieType}`;

/**
 * A Modifier is a number that is added to or subtracted from the result of a roll as a result of a relationship
 * with some kind of taxonomic classification. For example, a skill might give a +2 modifier to an attack roll, or
 * a trait might give a -1 modifier to a damage roll.
 */
export interface Modifier {
  type: Taxonomy.Modifiers;
  /**
   * `intrinsic` means the source of the modifier is the host object itself
   */
  source: Taxonomy.Skills | Taxonomy.Effects | Taxonomy.Traits | 'intrinsic';
  value: number;
  ts: number; // The moment the modifier was applied, expressed as milliseconds since the UNIX epoch
  duration: Duration; // The duration of the modifier
}

export type ModifierID = string;

/**
 * Modifiers is a dictionary indexed by modifier types.
 * The keys are the names of the modifiers, and the values are dictionaries
 */
export type Modifiers = Record<ModifierID, Modifier>;

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
