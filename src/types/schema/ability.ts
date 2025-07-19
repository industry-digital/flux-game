import { Duration } from '~/types/world/time';
import { Taxonomy, EffectURN, SkillURN } from '~/types/taxonomy';
import { Requirements } from '~/types/requirement';
import { TargetingSpecification } from '~/types/combat';
import { EffectSchema } from '~/types/taxonomy/effect';

export type AbilityEffects = Partial<Record<EffectURN, EffectSchema>>;

export enum AbilityType {
  /**
   * Actively triggered by the actor
   */
  ACTIVE = 'active',

  /**
   * Passive, "always-on" abilities
   */
  PASSIVE = 'passive',

  /**
   * Triggered by the environment or other actors
   */
  REACTIVE = 'reactive',
};

export type CostSpecification =
  | { mana: Partial<Record<Taxonomy.Mana, number>> }
  | { conc: number }
  | { hp: number }
  | { items: Partial<Record<Taxonomy.Items, number>> }
  | { currency: Partial<Record<Taxonomy.Currency, number>> }
;

export type AbilityTimers = {
    charge: Duration;
    cast: Duration;
    cooldown: Duration;
};

export type AbilityInContainment = {
  /**
   * Requirements for the ability to be used
   */
  requirements?: Requirements;

  /**
   * The kind of ability this is
   */
  type: AbilityType;

  /**
   * Targeting rules
   */
  targeting?: TargetingSpecification;

  /**
   * Effects that are applied to the target when the ability is used
   */
  effects: EffectSchema[];

  /**
   * Translation key for the ability name
   */
  name: string;

  /**
   * Translation key for the ability description
   */
  description: string;
};

export type AbilitySchema = AbilityInContainment & {
  /**
   * The related Skill
   */
  skill: SkillURN;
};
