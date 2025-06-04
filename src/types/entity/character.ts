import { Taxonomy, ItemURN } from '~/types/taxonomy';
import { AppliedEffects } from '~/types/taxonomy/effect';
import { EntityType, BaseEntity, DescribableMixin, ParsedURN, ParsedURNInput, EmergentNarrative } from '~/types/entity/entity';
import { SkillState, Specializations } from '~/types/entity/skill';
import { ItemState } from '~/types/entity/item';
import { createConditionUrn, createStatUrn } from '~/lib/taxonomy';
import {
  NormalizedValueBetweenZeroAndOne,
  ModifiableBoundedAttribute,
  ModifiableScalarAttribute,
  NormalizedBipolarValue,
} from '~/types/entity/attribute';

/**
 * Well-known character conditions that are fundamental to the game system.
 * These are a subset of all possible conditions (which are defined in the taxonomy).
 * These represent the core conditions that have special meaning for game mechanics.
 */
export const WellKnownCharacterCondition = {
  /**
   * Character is alive and able to act normally
   */
  ALIVE: createConditionUrn('state:alive'),

  /**
   * Character is alive but unable to take normal actions
   * Examples: unconscious, paralyzed, stunned
   */
  INCAPACITATED: createConditionUrn('state:incapacitated'),

  /**
   * Character is dead and cannot act without external intervention
   */
  DEAD: createConditionUrn('state:dead'),
} as const;

/**
 * Type alias for any valid character condition URN
 */
export type CharacterConditionURN = typeof WellKnownCharacterCondition[keyof typeof WellKnownCharacterCondition] | `flux:condition:${string}`;

/**
 * Well-known character stats that are fundamental to the game system.
 * These are a subset of all possible stats (which are defined in the taxonomy).
 * These represent the core stats that are always present and have special meaning.
 */
export const WellKnownCharacterStat = {
  /**
   * Strength. Physical power and raw force. Affects:
   * - Heavy weapon effectiveness
   * - Athletic feats requiring force
   * - Carrying capacity
   */
  STR: createStatUrn('str'),

  /**
   * Dexterity. Fine motor control and precision. Affects:
   * - Precise weapon effectiveness
   * - Delicate manual tasks
   * - Crafting quality
   */
  DEX: createStatUrn('dex'),

  /**
   * Agility. Speed, grace, and coordination. Affects:
   * - Movement speed and evasion
   * - Initiative in combat, together with WIS
   * - Athletic feats requiring agility
   */
  AGI: createStatUrn('agi'),

  /**
   * Constitution. Physical resilience and endurance. Affects:
   * - Health points and injury resistance
   * - Stamina and fatigue resistance
   * - Resistance to poison, disease, and physical afflictions
   */
  CON: createStatUrn('con'),

  /**
   * Intelligence. Reasoning ability and learning capacity. Affects:
   * - Rate of experience gain (PXP→XP conversion)
   * - Complex abilities and higher learning
   * - Problem-solving and analysis
   */
  INT: createStatUrn('int'),

  /**
   * Wisdom. Awareness, intuition, and mental fortitude. Affects:
   * - Initiative in combat, together with Agility
   * - Detecting deception and hidden threats
   * - Resistance to fear, confusion, and mental effects
   * - Situational awareness and gut instincts
   */
  WIS: createStatUrn('wis'),

  /**
   * Presence. Force of personality and social influence. Affects:
   * - All social interactions and negotiations
   * - Leadership and group coordination
   * - Intimidation and commanding respect
   */
  PRS: createStatUrn('prs'),

  /**
   * Luck. Fortune and supernatural favor. Affects:
   * - Critical successes and failure avoidance
   * - Rare item discovery and advantageous encounters
   * - Quest opportunities and serendipitous events
   */
  LCK: createStatUrn('lck'),
} as const;

/**
 * Type alias for any valid character stat URN
 */
export type CharacterStatURN = typeof WellKnownCharacterStat[keyof typeof WellKnownCharacterStat] | `flux:stat:${string}`;

/**
 * Map of character stats to their values
 */
export type CharacterStats = Partial<Record<CharacterStatURN, ModifiableScalarAttribute>>;

export type EquipmentSlots = Partial<Record<ItemURN, 1>>;
export type Equipment = Partial<Record<Taxonomy.Anatomy, EquipmentSlots>>;
export type Skills = Partial<Record<Taxonomy.Skills, SkillState>>;
export type Membership = { role: string; ts: number; duration?: number };
export type Memberships = Partial<Record<Taxonomy.Factions, Membership>>;
export type Reputation = Partial<Record<Taxonomy.Factions, NormalizedBipolarValue>>;
export type Traits = Partial<Record<Taxonomy.Traits, 1>>;
export type Injuries = Partial<Record<Taxonomy.Anatomy, AppliedAnatomicalDamage>>;
export type ManaPools = Partial<Record<Taxonomy.Mana, ModifiableBoundedAttribute>>;
export type Subscriptions = Partial<Record<Taxonomy.Topics, 1>>;

export type Inventory = {
  /**
   * Total mass of all items in the inventory, in grams
   */
  mass: number;

  /**
   * Map of item IDs to their state
   */
  items: Partial<Record<string, ItemState>>;

  /**
   * Last inventory update timestamp
   */
  ts: number;
};

export type AppliedAnatomicalDamage = {
  /**
   * The relative "health" of this part of the body. This is a normalized value between 0 and 1.
   * 0 means the body part is functionally unusable. 1 means it is in perfect condition.
   * By mapping anatomy to equipment slots, we can do interesting things when a player takes damage to a part of the
   * body, like cause the player to drop their weapon if they take critical damage to their hand.
   */
  integrity: NormalizedValueBetweenZeroAndOne;

  /**
   * Effects that are currently affecting this part of the body.
   */
  effects: AppliedEffects;
};

/**
 * The fragments that comprise a Character's total data.
 * Each value (except 'base') must exist as a field in the Character type.
 */
export enum CharacterFragmentName {
  /**
   * Core data: name, description, location, etc.
   */
  BASE = 'base',

  /**
   * Health, mana, injuries, and active effects
   */
  VITALS = 'vitals',

  /**
   * Items and equipment
   */
  INVENTORY = 'inventory',

  /**
   * Character skills
   */
  SKILLS = 'skills',

  /**
   * Character stats and traits
   */
  STATS = 'stats',

  /**
   * Social relationships and reputation
   */
  SOCIAL = 'social'
}

/**
 * Character's vital statistics including health, mana, active effects and injuries
 */
export type CharacterVitalsFragment = {
  traits: Traits;
  stats: CharacterStats;
  condition: CharacterConditionURN;
  hp: ModifiableBoundedAttribute;
  injuries: Injuries;
  mana: ManaPools;
  effects: AppliedEffects;
};

/**
 * Character's inventory including carried items and equipped gear
 */
export type CharacterInventoryFragment = Inventory & {
  equipment: Equipment;
};

/**
 * Character's social relationships and preferences
 */
export type CharacterSocialFragment = {
  memberships: Memberships;
  reputation: Reputation;
  subscriptions: Subscriptions;
};

/**
 * Tracks a character's skill development and specializations.
 * This replaces the previous CharacterSkillsFragment with a more
 * comprehensive progression tracking system.
 */
export type CharacterProgressionFragment = {
  level: ModifiableScalarAttribute;

  /**
   * The character's current skills and their states
   */
  skills: Skills;

  /**
   * The character's skill specializations
   */
  specializations: Specializations;
};

/**
 * Character preferences that control various gameplay and interaction settings
 */
export type CharacterPreferencesFragment = Partial<Record<Taxonomy.Preferences, any>>;

/**
 * A Character represents an actor in the game world, whether controlled by a player or by the game system.
 * Characters are the primary agents of change in the world, capable of taking actions, using items,
 * and interacting with other entities.
 */
export type Character = BaseEntity<EntityType.CHARACTER> & DescribableMixin & {
  /**
   * The Character's current location in the world.
   * Every character must be somewhere - even if it's in a special place like 'nowhere'.
   */
  location: ParsedURN<EntityType.PLACE>;

  /**
   * If the character is a member of a party.
   * This must point to a collection of kind 'party'.
   */
  party?: ParsedURN<EntityType.COLLECTION> & { kind: 'party' };

  vitals: CharacterVitalsFragment;
  inventory: CharacterInventoryFragment;
  social: CharacterSocialFragment;
  progression: CharacterProgressionFragment
  preferences: CharacterPreferencesFragment;
};

/**
 * The input type for creating a new Character, containing only the required fields
 * that need to be provided when creating a Character.
 */
export type CharacterInput = {
  /**
   * Basic character information
   */
  name: string;
  description: string | EmergentNarrative;
  location?: ParsedURNInput<EntityType.PLACE>;

  /**
   * Character fragments
   */
  vitals?: Partial<CharacterVitalsFragment>;
  inventory?: Partial<CharacterInventoryFragment>;
  social?: Partial<CharacterSocialFragment>;
  progression?: Partial<CharacterProgressionFragment>;
  preferences?: CharacterPreferencesFragment;
};

// For backward compatibility
export type CharacterStatName = keyof typeof WellKnownCharacterStat;
export type CharacterCondition = keyof typeof WellKnownCharacterCondition;
