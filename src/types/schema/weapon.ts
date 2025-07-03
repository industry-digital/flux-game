import { Taxonomy, AmmoURN } from '~/types/taxonomy';
import { EquipmentMixin } from '~/types/schema/equipment';
import { ChargeableMixin } from '~/types/entity/item';
import { Duration } from '~/types/world/time';
import { ActorStat } from '~/types/entity/actor';
import { DamageSpecification } from '~/types/damage';
import { UnitOfMeasure } from '~/types/world/measures';

export type WeaponAttackSpecification = {
  /**
   * The stat that modifies the weapon's attack rolls
   */
  stat: ActorStat;

  /**
   * The base attack value of the weapon. Dice rolls are added to this value.
   * This directly affects a weapon's ability to hit a target.
   */
  base: number;
}

export type WeaponTimers = {
  /**
   * The time it takes to ready the weapon for combat, after combat starts
   */
  setup?: Duration;

  /**
   * The time it takes to "charge" or "wind up" the weapon before firing
   */
  charge?: Duration;

  /**
   * The time it takes to fire or swing the weapon
   */
  fire?: Duration;

  /**
   * The time it takes to cool down the weapon after firing
   */
  cooldown?: Duration;

  /**
   * The time it takes to reload the weapon
   */
  reload?: Duration;
}

export type WeaponRangeSpecification = {
  optimal: | [number, UnitOfMeasure];
  falloff?: [number, UnitOfMeasure];
  min?: [number, UnitOfMeasure];
  max?: [number, UnitOfMeasure];
}

/**
 * Complete attributes for a weapon item
 */
export interface WeaponSchema extends EquipmentMixin, Partial<ChargeableMixin> {

  /**
   * The anatomical locations this item occupies while the weapon is equipped.
   */
  fit: Record<Taxonomy.Anatomy, 1>;

  /**
   * How easy it is to hit a target
   */
  attack: WeaponAttackSpecification;

  /**
   * How much damage the weapon deals
   */
  damage: DamageSpecification;

  /**
   * Weapon range specifications
   */
  range: WeaponRangeSpecification;

  /**
   * The timers that affect the weapon's performance
   */
  timers: WeaponTimers;

  /**
   * If this weapon consumes ammo, this is the type of ammo it uses
   */
  ammo?: AmmoURN;
}
