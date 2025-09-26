import { AmmoSchemaURN, SkillURN, Taxonomy } from '~/types/taxonomy';
import { Equippable } from '~/types/schema/equipment';
import { ChargeableMixin } from '~/types/entity/item';
import { DamageSpecification } from '~/types/damage';
import { AbstractItemSchema } from '~/types/schema/item';

export type WeaponAttackSpecification = {
  /**
   * The base attack rating of the weapon. Defaults to zero.
   */
  base?: number;
}

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
   * The time it takes to reload the weapon
   */
  reload?: number;
}

export type WeaponRangeSpecification = {
  optimal: number;
  falloff?: number;
  min?: number;
  max?: number;
}

/**
 * Complete attributes for a weapon item
 */
export type WeaponSchema  =
& AbstractItemSchema<'weapon'>
& Equippable
& Partial<ChargeableMixin>
& {

  /**
   * The skill that modifies the weapon's effectiveness
   */
  skill: SkillURN;

  /**
   * How easy it is to hit a target
   */
  attack?: WeaponAttackSpecification;

  /**
   * How much damage the weapon deals
   * @deprecated
   */
  damage?: DamageSpecification;

  /**
   * Weapon range specifications
   */
  range: WeaponRangeSpecification;

  /**
   * The timers that affect the weapon's performance
   */
  timers?: WeaponTimers;

  /**
   * If this weapon consumes ammo, this is the type of ammo it uses
   */
  ammo?: WeaponAmmoSpecification;

  /**
   * The anatomical locations this item occupies while the weapon is equipped.
   */
  fit?: Partial<Record<Taxonomy.Anatomy, 1>>;
};
