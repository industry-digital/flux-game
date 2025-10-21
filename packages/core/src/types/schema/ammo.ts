import { DamageSpecification } from '~/types/damage';
import { PhysicalEntitySchema } from '~/types/schema/schema';
import { AmmoSchemaURN } from '~/types/taxonomy';

export type AmmoDamageSpecification = Omit<DamageSpecification, 'model' | 'base'>;

/**
 * Schema for ammunition items
 * Defines the damage characteristics and properties of ammunition
 */
export type AmmoSchema = PhysicalEntitySchema<AmmoSchemaURN> & {
  damage: Pick<DamageSpecification, 'base' | 'types'>;
  capacity: number;
};
