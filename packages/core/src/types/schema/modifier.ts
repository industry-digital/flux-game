import { ModifierSchemaURN, StatURN, SkillURN } from '~/types/taxonomy';
import { EntitySchema } from './schema';
import { EasingFunctionName } from '~/types/easing';

/**
 * Schema definition for modifiers
 * Defines the static properties of a modifier type
 */
export type ModifierSchema = EntitySchema<ModifierSchemaURN> & {
  urn: ModifierSchemaURN;
  name: string;
  description: string;
  appliesTo: SkillURN | StatURN;
  classification?: string;
  curve: EasingFunctionName;
  duration: number;
};
