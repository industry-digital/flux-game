import { RollResultWithoutModifiers, RollSpecification } from '~/types/dice';
import { NormalizedValueBetweenZeroAndOne } from '~/types/entity/attribute';
import { Stat } from '~/types/entity/actor';

/**
 * Represents all possible damage types in the cyberpunk world.
 * These are used for weapon damage profiles, armor resistances,
 * and augmentation vulnerabilities.
 */
export enum DamageType {
  /**
   * Relating to any kind of kinetic energy penetrators, including spears, bullets, and railguns
   */
  PIERCE = 'kinetic:pierce',

  /**
   * Relating to any kind of slashing damage, including swords, knives, and claws
   */
  SLASH = 'kinetic:slash',

  /**
   * Relating to any kind of blunt force, including hammers, clubs, and fists
   */
  IMPACT = 'kinetic:impact',
}

export enum DamageModel {
  STAT_SCALING = 'stat',
  FIXED = 'fixed',
}

export type AbstractDamageSpecification<TDamageModel extends DamageModel> = {
  model: TDamageModel;
}

export type StatScalingDamageSpecification = AbstractDamageSpecification<DamageModel.STAT_SCALING> & {
  /**
   * The stat that damage scales with.
   */
  stat: Stat;

  base: RollSpecification;
  types: Partial<Record<DamageType, NormalizedValueBetweenZeroAndOne>>;
  /**
   * Damage transfer efficiency
   * How this is applied depends on the nature of the weapon
   */
  efficiency: number;
}

export type FixedDamageSpecification = AbstractDamageSpecification<DamageModel.FIXED> & {
  base: RollSpecification;
  types: Partial<Record<DamageType, NormalizedValueBetweenZeroAndOne>>;
};

export type DamageSpecification = StatScalingDamageSpecification | FixedDamageSpecification;

export type DamageSummary = RollResultWithoutModifiers;
