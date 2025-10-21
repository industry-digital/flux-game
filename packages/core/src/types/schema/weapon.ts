import { AmmoSchemaURN, SkillSchemaURN, Taxonomy } from '~/types/taxonomy';
import { Equippable } from '~/types/schema/equipment';
import { DamageModel, DamageType } from '~/types/damage';
import { AbstractItemSchema } from '~/types/schema/item';
import { RollSpecification } from '~/types/dice';
import { Stat } from '~/types/entity/actor';
import { NormalizedValueBetweenZeroAndOne } from '~/types/entity/attribute';

export enum AccuracyModel {
  SKILL_SCALING = 'skill',
}

export type AbstractAccuracySpecification<TAccuracyModel extends AccuracyModel> = {
  model: TAccuracyModel;
  base: RollSpecification;
}

export type SkillScalingAccuracySpecification = AbstractAccuracySpecification<AccuracyModel.SKILL_SCALING> & {
  skill: SkillSchemaURN;
}

export type AccuracySpecification = SkillScalingAccuracySpecification;

export type WeaponAmmoSpecification = {
  type: AmmoSchemaURN;
  capacity: number;
}

/**
 * All timers are in milliseconds
 */
export type WeaponTimers = {
  /**
   * The time it takes to ready the weapon for combat, after combat starts
   */
  setup?: number;

  /**
   * The time it takes to "charge" or "wind up" the weapon before firing
   * This is a separate concept from loading the weapon with ammo.
   */
  charge?: number;

  /**
   * The time it takes to fire or swing the weapon
   */
  fire?: number;

  /**
   * The time it takes to cool down the weapon after firing
   */
  cooldown?: number;

  /**
   * The time it takes to load the weapon
   */
  reload?: number;
}

export type WeaponRangeSpecification = {
  optimal: number;
  /**
   * If the weapon has a `falloff`, it is effectively a ranged weapon.
   */
  falloff?: number;
  min?: number;
  max?: number;
}

export type FixedDamageMixin = {
  damage: {
    model: DamageModel.FIXED;
    base?: RollSpecification;
  };
};

export type MeleeStatScalingDamageMixin = {
  damage: {
    model: DamageModel.STAT_SCALING;
    stat: Stat;
    base: RollSpecification;
    efficiency: number;
    types: Partial<Record<DamageType, NormalizedValueBetweenZeroAndOne>>;
  };
};

export type RangedStatScalingDamageMixin = {
  damage: {
    model: DamageModel.STAT_SCALING;
    stat: Stat;
    base: RollSpecification;
    efficiency: number;
  };
  ammo: {
    type: AmmoSchemaURN;
    capacity: number;
  };
};

/**
 * Complete attributes for a weapon item
 */
export type WeaponSchema  =
& AbstractItemSchema<'weapon'>
& Equippable
& (MeleeStatScalingDamageMixin | RangedStatScalingDamageMixin | FixedDamageMixin)
& {

  /**
   * The anatomical locations this item occupies while the weapon is equipped.
   */
  fit: Partial<Record<Taxonomy.Anatomy, 1>>;

  /**
   * Describes how the weapon's attack rating is determined
   */
  accuracy: AccuracySpecification;

  /**
   * Weapon range specifications
   */
  range: WeaponRangeSpecification;

  /**
   * The timers that affect the weapon's performance
   */
  timers?: WeaponTimers;
};
