import {
  Duration,
  EffectURN,
  Requirements,
  SkillURN,
  TargetingSpecification,
  Taxonomy,
} from '~/types';

export type AbilityEffects = Partial<Record<EffectURN, any>>;

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
  | { currency: number }
;

export type AbilityTimers = {
    charge: Duration;
    cast: Duration;
    cooldown: Duration;
};

export type AbilitySchema = {
  /**
   * The related Skill
   */
  skill: SkillURN;

  /**
   * Requirements for the ability to be used
   */
  requirements: Requirements;

  /**
   * The kind of ability this is
   */
  type: AbilityType;

  /**
   * Targeting rules
   */
  targeting: TargetingSpecification;

  /**
   * Effects that are applied to the target when the ability is used
   */
  effects: AbilityEffects;

  /**
   * Translation key for the ability name
   */
  name: string;

  /**
   * Translation key for the ability description
   */
  description: string;
};
