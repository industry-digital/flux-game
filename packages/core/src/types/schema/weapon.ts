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

export type SkillScalingAccuracySpecification = AbstractAccuracySpecification<AccuracyModel.SKILL_SCALING>;

export type AccuracySpecification = SkillScalingAccuracySpecification;

export type WeaponAmmoSpecification = {
  type: AmmoSchemaURN;
  capacity: number;
}

export enum WeaponTimer {
  SETUP = 'setup',
  ATTACK = 'attack',
  RELOAD = 'reload',
  AIM = 'aim',
}

export type MeleeWeaponTimers = Record<Exclude<WeaponTimer, WeaponTimer.RELOAD | WeaponTimer.AIM>, number>;
export type RangedWeaponTimers = Record<WeaponTimer, number>;
export type WeaponTimers = MeleeWeaponTimers | RangedWeaponTimers;

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

  skill: SkillSchemaURN;

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
  timers: WeaponTimers;
};
