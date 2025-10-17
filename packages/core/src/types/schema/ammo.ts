import { DamageType } from '~/types/damage';
import { NormalizedValueBetweenZeroAndOne } from '~/types/entity/attribute';
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
  damageTypes: Partial<Record<DamageType, NormalizedValueBetweenZeroAndOne>>;

  /**
   * The number of shots at full capacity
   */
  capacity: number;
};
