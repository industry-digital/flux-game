import { RootNamespace, Taxonomy } from '@flux/taxonomy';
import { EquipmentMixin } from './equipment';
import { Duration } from '@flux/world/time';
import { CharacterStatName } from '@flux/entity/character';
import { DamageSpecification } from '@flux/damage';
import { UnitOfMeasure } from '@flux/world/measures';
import { ChargeableMixin } from '@flux/entity/item';

export type WeaponAttackSpecification = {
  /**
   * The stat that modifies the weapon's attack rolls
   */
  stat: CharacterStatName;

  /**
   * The base attack value of the weapon. Dice rolls are added to this value.
   * This directly affects a weapon's ability to hit a target.
   */
  base: number;
}

export type WeaponTimersDictionary = {
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
  optimal: [number, UnitOfMeasure];
  falloff?: [number, UnitOfMeasure];
  min?: [number, UnitOfMeasure];
}

/**
 * Complete attributes for a weapon item
 */
export interface WeaponSpecification extends EquipmentMixin, Partial<ChargeableMixin> {

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
  timers?: WeaponTimersDictionary;

  /**
   * If this weapon takes ammo, this defines the ammo type and behavior
   */
  ammo?: `${RootNamespace}:ammo:${string}`;
}
