import { RollSpecification } from '~/types/dice';
import { NormalizedValueBetweenZeroAndOne } from '~/types/entity/attribute';
import { ActorStat } from '~/types/entity/actor';

/**
 * Represents all possible damage types in the cyberpunk world.
 * These are used for weapon damage profiles, armor resistances,
 * and augmentation vulnerabilities.
 */
export enum DamageType {
  /**
   * Relating to any kind of kinetic energy penetrators, including spears, bullets, and railguns
   */
  PIERCE = 'pierce',

  /**
   * Relating to any kind of slashing damage, including swords, knives, and claws
   */
  SLASH = 'slash',

  /**
   * Relating to any kind of blunt force, including hammers, clubs, and fists
   */
  IMPACT = 'impact',

  /**
   * Relating to explosive overpressure
   */
  EXPLOSIVE = 'explosive',

  /**
   * Relating to temperature (e.g., heat, cold)
   */
  THERMAL = 'thermal',

  /**
   * Relating to electromagnatic phenomena, such as EMP bombs and lasers
   */
  ELECTROMAGNETIC = 'electromagnetic',

  /**
   * Relating to chemical reactions (e.g., acid, poison)
   */
  CHEMICAL = 'chemical',

  /**
   * Relating to biological effects (e.g., pathogens, disease)
   */
  BIOLOGICAL = 'bio',
}

/**
 * Represents the damage profile for a weapon
 */
export type DamageSpecification = {
  /**
   * The stat that the weapon scales with
   */
  stat: keyof typeof ActorStat;

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
