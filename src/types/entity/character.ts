import { Taxonomy, ItemURN } from '~/types/taxonomy';
import { AppliedEffects } from '~/types/taxonomy/effect';
import { EntityType, SymbolicLink, BaseEntity, DescribableMixin } from '~/types/entity/entity';
import { SkillState } from '~/types/entity/skill';
import { ItemState } from '~/types/entity/item';
import { createStatUrn, createConditionUrn } from '~/lib/taxonomy';
import {
  NormalizedValueBetweenZeroAndOne,
  ModifiableBoundedAttribute,
  ModifiableScalarAttribute,
  NormalizedBipolarValue,
} from '~/types/entity/attribute';
import { ParsedURN } from '~/types/entity/entity';

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
  STR: createStatUrn('physical:strength'),

  /**
   * Dexterity. Fine motor control and precision. Affects:
   * - Precise weapon effectiveness
   * - Delicate manual tasks
   * - Crafting quality
   */
  DEX: createStatUrn('physical:dexterity'),

  /**
   * Agility. Speed, grace, and coordination. Affects:
   * - Movement speed and evasion
   * - Initiative in combat, together with WIS
   * - Athletic feats requiring agility
   */
  AGI: createStatUrn('physical:agility'),

  /**
   * Constitution. Physical resilience and endurance. Affects:
   * - Health points and injury resistance
   * - Stamina and fatigue resistance
   * - Resistance to poison, disease, and physical afflictions
   */
  CON: createStatUrn('physical:constitution'),

  /**
   * Intelligence. Reasoning ability and learning capacity. Affects:
   * - Rate of experience gain (PXP→XP conversion)
   * - Complex abilities and higher learning
   * - Problem-solving and analysis
   */
  INT: createStatUrn('mental:intelligence'),

  /**
   * Wisdom. Awareness, intuition, and mental fortitude. Affects:
   * - Initiative in combat, together with Agility
   * - Detecting deception and hidden threats
   * - Resistance to fear, confusion, and mental effects
   * - Situational awareness and gut instincts
   */
  WIS: createStatUrn('mental:wisdom'),

  /**
   * Presence. Force of personality and social influence. Affects:
   * - All social interactions and negotiations
   * - Leadership and group coordination
   * - Intimidation and commanding respect
   */
  PRS: createStatUrn('social:presence'),

  /**
   * Luck. Fortune and supernatural favor. Affects:
   * - Critical successes and failure avoidance
   * - Rare item discovery and advantageous encounters
   * - Quest opportunities and serendipitous events
   */
  LCK: createStatUrn('supernatural:luck'),
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
  level: number;
  stats: CharacterStats;
  hp: ModifiableBoundedAttribute;
  mana: ManaPools;
  injuries: Injuries;
  condition: CharacterConditionURN;
  effects: AppliedEffects;
};

/**
 * Character's inventory including carried items and equipped gear
 */
export type CharacterInventoryFragment = {
  mass: ModifiableScalarAttribute;
  items: Inventory;
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
 * Character's learned skills and abilities
 */
export type CharacterSkillsFragment = Skills;

/**
 * Character preferences that control various gameplay and interaction settings
 */
export type CharacterPreferencesFragment = Partial<Record<Taxonomy.Preferences, any>>;

/**
 * Character attributes that encompass all the character's state
 */
export type CharacterAttributes = {
  level: number;
  condition: CharacterConditionURN;
  hp: ModifiableBoundedAttribute;
  mass: ModifiableScalarAttribute;
  stats: CharacterStats;
  mana: ManaPools;
  injuries: Injuries;
  equipment: Equipment;
  traits: Traits;
  skills: Skills;
  memberships: Memberships;
  reputation: Reputation;
  subscriptions: Subscriptions;
  effects: AppliedEffects;
  inventory: Inventory;
  abilities: Partial<Record<string, any>>;
  preferences: CharacterPreferencesFragment;
  origin?: string;
};

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
  party?: SymbolicLink<EntityType.COLLECTION> & { kind: 'party' };

  /**
   * Character-specific attributes
   */
  attributes: CharacterAttributes;
};

/**
 * The input type for creating a new Character, containing only the required fields
 * that need to be provided when creating a Character.
 */
export type CharacterInput = Partial<Omit<Character, keyof BaseEntity<EntityType.CHARACTER>>>;

// For backward compatibility
export type CharacterStatName = keyof typeof WellKnownCharacterStat;
export type CharacterCondition = keyof typeof WellKnownCharacterCondition;
