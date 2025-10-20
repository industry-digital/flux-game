import { FixedDamageSpecification } from '~/types/damage';
import { AbstractItemSchema } from '~/types/schema/item';

/**
 * Schema for ammunition items
 * Defines the damage characteristics and properties of ammunition
 */
export type AmmoSchema = AbstractItemSchema<'ammo'> & {
  /**
   * The types of damage this ammunition deals
   * All entries must sum to 1.0
   */
  damage: FixedDamageSpecification;
};
