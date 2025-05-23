import { RollSpecification } from '@flux/dice';
import { NormalizedValueBetweenZeroAndOne } from '@flux/entity/attribute';
import { CharacterStatName } from '@flux/entity/character';

/**
 * Represents all possible damage types in the cyberpunk world.
 * These are used for weapon damage profiles, armor resistances,
 * and augmentation vulnerabilities.
 */
export enum DamageType {
  KINETIC = 'kinetic',
  EXPLOSIVE = 'explosive',
  THERMAL = 'thermal',
  EM = 'em',
  CHEMICAL = 'chemical',
  BIOLOGICAL = 'bio',
}

/**
 * Represents the damage profile for a weapon
 */
export type DamageSpecification = {
  /**
   * The stat that the weapon scales with
   */
  stat: CharacterStatName;

  /**
   * The base damage of the weapon
   */
  dice: RollSpecification;

  /**
   * The types of damage the weapon deals
   * The values are normalized between 0.0 and 1.0, and must sum to 1.0
   */
  types: Partial<Record<DamageType, NormalizedValueBetweenZeroAndOne>>;
}
