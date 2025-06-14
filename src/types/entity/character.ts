import { Taxonomy, ItemURN, PlaceURN, RootNamespace } from '~/types/taxonomy';
import { AppliedEffects } from '~/types/taxonomy/effect';
import { EntityType, EmergentNarrative, SymbolicLink, AbstractEntity, DescribableMixin } from '~/types/entity/entity';
import { Party } from '~/types/entity/group';
import { SkillState, Specializations } from '~/types/entity/skill';
import { ItemState } from '~/types/entity/item';
import {
  NormalizedValueBetweenZeroAndOne,
  ModifiableBoundedAttribute,
  ModifiableScalarAttribute,
  NormalizedBipolarValue,
} from '~/types/entity/attribute';

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
  STR: 'str',

  /**
   * Dexterity. Fine motor control and precision. Affects:
   * - Precise weapon effectiveness
   * - Delicate manual tasks
   * - Crafting quality
   */
  DEX: 'dex',

  /**
   * Agility. Speed, grace, and coordination. Affects:
   * - Movement speed and evasion
   * - Initiative in combat, together with WIS
   * - Athletic feats requiring agility
   */
  AGI: 'agi',

  /**
   * Constitution. Physical resilience and endurance. Affects:
   * - Health points and injury resistance
   * - Stamina and fatigue resistance
   * - Resistance to poison, disease, and physical afflictions
   */
  CON: 'con',

  /**
   * Intelligence. Reasoning ability and learning capacity. Affects:
   * - Rate of experience gain (PXP→XP conversion)
   * - Complex abilities and higher learning
   * - Problem-solving and analysis
   */
  INT: 'int',

  /**
   * Wisdom. Awareness, intuition, and mental fortitude. Affects:
   * - Initiative in combat, together with Agility
   * - Detecting deception and hidden threats
   * - Resistance to fear, confusion, and mental effects
   * - Situational awareness and gut instincts
   */
  WIS: 'wis',

  /**
   * Presence. Force of personality and social influence. Affects:
   * - All social interactions and negotiations
   * - Leadership and group coordination
   * - Intimidation and commanding respect
   */
  PRS: 'prs',

  /**
   * Luck. Fortune and supernatural favor. Affects:
   * - Critical successes and failure avoidance
   * - Rare item discovery and advantageous encounters
   * - Quest opportunities and serendipitous events
   */
  LCK: 'lck',
} as const;

/**
 * Type alias for any valid character stat URN
 * @deprecated Use the string literal type instead
 */
export type CharacterStatURN = typeof WellKnownCharacterStat[keyof typeof WellKnownCharacterStat] | `${RootNamespace}:stat:${string}`;

/**
 * Map of character stats to their values
 */
export type CharacterStats = Partial<Record<CharacterStatName, ModifiableScalarAttribute>>;
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
export type Wallet = Partial<Record<Taxonomy.Currency, number>>;

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
 * The input type for creating a new Character, containing only the required fields
 * that need to be provided when creating a Character.
 */
export type CharacterInput = {
  /**
   * Basic character information
   */
  name?: string;
  description?: string | EmergentNarrative;
  location?: PlaceURN;
};

export type Character =
  & AbstractEntity<EntityType.CHARACTER>
  & DescribableMixin
  & {

  /**
   * Current location
   */
  location: SymbolicLink<EntityType.PLACE>;

  /**
   * Optional party membership
   */
  party?: Party;
  level: ModifiableScalarAttribute;
  hp: ModifiableBoundedAttribute;
  traits: Traits;
  stats: CharacterStats;
  injuries: Injuries;
  mana: ManaPools;
  effects: AppliedEffects;
  inventory: Inventory;
  equipment: Equipment;
  wallet: Wallet;
  memberships: Memberships;
  reputation: Reputation;
  subscriptions: Subscriptions;
  skills: Skills;
  specializations: Specializations;
  prefs: Partial<Record<Taxonomy.Preferences, unknown>>;
};

// For backward compatibility
export type CharacterStatName = keyof typeof WellKnownCharacterStat;
