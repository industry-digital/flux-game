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
   * Bullets, arrows, most melee/martial weapons
   */
  KINETIC = 'kinetic',

  /**
   * Flame weapons, lasers
   */
  THERMAL = 'thermal',

  /**
   * Explosives, grenades, bombs, etc.
   */
  EXPLOSIVE = 'explosive',

  /**
   * Relating to any kind of kinetic energy penetrators, including spears, bullets, and railguns
   * @deprecated Use KINETIC instead
   */
  PIERCE = 'kinetic:pierce',

  /**
   * Relating to any kind of slashing damage, including swords, knives, and claws
   * @deprecated Use KINETIC instead
   */
  SLASH = 'kinetic:slash',

  /**
   * Relating to any kind of blunt force, including hammers, clubs, and fists
   * @deprecated Use KINETIC instead
   */
  IMPACT = 'kinetic:impact',
}

export enum DamageModel {
  STAT_SCALING = 'stat',
  FIXED = 'fixed',
}

export type AbstractDamageSpecification<TDamageModel extends DamageModel> = {
  model: TDamageModel;
  base: RollSpecification;
  /**
   * For weapons that have ammo, this will always be an empty Record.
   * Damage type is determined by equipped ammo.
   */
  types: Partial<Record<DamageType, NormalizedValueBetweenZeroAndOne>>;
}

export type StatScalingDamageSpecification = AbstractDamageSpecification<DamageModel.STAT_SCALING> & {
  /**
   * The stat that damage scales with.
   */
  stat: Stat;

  /**
   * Stat scaling efficiency. How well does the stat bonus convert to damage?
   */
  efficiency: number;
}

export type FixedDamageSpecification = AbstractDamageSpecification<DamageModel.FIXED>;

export type DamageSpecification = StatScalingDamageSpecification | FixedDamageSpecification;

export type DamageSummary = RollResultWithoutModifiers;
