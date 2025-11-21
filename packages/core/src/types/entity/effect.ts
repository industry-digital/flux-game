import { EffectURN, Intrinsic, Taxonomy } from '~/types/taxonomy';
import { NormalizedValueBetweenZeroAndOne } from '~/types/entity/attribute';
import { EffectSchema } from '~/types/schema/effect';

export type EffectSource =
  | Taxonomy.Actors
  | Taxonomy.Skills
  | Taxonomy.Abilities
  | Taxonomy.Traits
  | Taxonomy.Items
  | Intrinsic;

/**
 * An Effect is a temporary state or condition applied to an Entity.
 */
export type AppliedEffect = Partial<Pick<EffectSchema, 'curve' | 'duration'>> & {
  /**
   * The schema of the effect
   */
  schema: EffectURN;

  /**
   * The moment the effect was applied; epoch milliseconds
   */
  ts: number;

  /**
   * The initial value of the effect
   */
  initial: number;

  /**
   * Instantaneous position on the easing curve; 0.0 = start, 1.0 = end
   * Easing curve is defined in the effect schema
   */
  position: NormalizedValueBetweenZeroAndOne;

  /**
   * The source of the effect (an Entity, a skill, or 'intrinsic').
   */
  source?: EffectSource;
};

/**
 * A dictionary of effects applied to an entity, keyed by opaque local IDs.
 */
export type AppliedEffects = Record<string, AppliedEffect>;

export enum WellKnownEffect {
  BLEEDING = 'flux:effect:condition:bleeding',
  PARALYZED = 'flux:effect:condition:paralyzed',
  INVISIBLE = 'flux:effect:condition:invisible',
  SLOWED = 'flux:effect:condition:slowed',
  WEAKENED = 'flux:effect:condition:weakened',
  BURNING = 'flux:effect:condition:burning',
  POISONED = 'flux:effect:condition:poisoned',
};
