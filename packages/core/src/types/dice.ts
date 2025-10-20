import { Actor } from '~/types/entity/actor';
import { AppliedModifiers } from './modifier';
import { WeaponSchema } from '~/types/schema/weapon';
import { SkillSchema } from '~/types/schema/skill';
import { PotentiallyImpureOperations } from '~/types/handler';
import { SkillSchemaURN } from '~/types/taxonomy';
import { SkillState } from '~/types/entity/skill';

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
export type RollSpecification = `${number}d${DieSize}` | `${number}d${DieSize}+${number}`;

export type RollResultWithoutModifiers = {
  /**
   * The roll that was made. For example, "2d6", meaning two six-sided dice were rolled.
   */
  dice: RollSpecification;
  /**
   * The raw values of the dice that were rolled.
   */
  values: number[];
  /**
   * The sum of the raw values of the dice that were rolled.
   */
  natural: number;
  /**
   * The flat bonus that was added to the roll, if `dice` looked like `${number}d${DieSize}+${number}`.
   */
  bonus: number;
  /**
   * The final result of the roll, after all modifiers have been applied.
   */
  result: number;
};

export type RollResult = RollResultWithoutModifiers & {
  /**
   * The modifiers that should be applied to compute the final value.
   */
  mods?: AppliedModifiers;
};

export type RollApi = {
  // High-level semantic rolls
  rollWeaponAccuracy(actor: Actor, weapon: WeaponSchema): RollResult;
  rollWeaponDamage(actor: Actor, weapon: WeaponSchema): RollResult;
  rollSkillCheck(actor: Actor, skill: SkillSchema): RollResult;
};

export type RollApiDependencies = {
  random: PotentiallyImpureOperations['random'];
  timestamp: PotentiallyImpureOperations['timestamp'];
  getActorSkill: (actor: Actor, skill: SkillSchemaURN) => SkillState;
  getEffectiveSkillRank: (actor: Actor, skill: SkillSchemaURN, baseSkill?: SkillState) => number;
};
