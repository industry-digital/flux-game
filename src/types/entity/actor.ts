import { Taxonomy, ItemURN, PlaceURN } from '~/types/taxonomy';
import { AppliedEffects } from '~/types/taxonomy/effect';
import { EntityType, SymbolicLink, AbstractEntity, Describable } from '~/types/entity/entity';
import { SkillState, Specializations } from '~/types/entity/skill';
import { ItemState } from '~/types/entity/item';
import {
  NormalizedValueBetweenZeroAndOne,
  ModifiableBoundedAttribute,
  ModifiableScalarAttribute,
  NormalizedBipolarValue,
} from '~/types/entity/attribute';
import { GroupSymbolicLink, GroupType } from '~/types/entity/group';

/**
 * The kinds of actors in the simulation
 */
export enum ActorType {
  /**
   * Player character
   */
  PC = 'pc',

  /**
   * Non-player character (friendly NPCs, quest givers, etc.)
   */
  NPC = 'npc',

  /**
   * Hostile creature or monster
   */
  MONSTER = 'monster',
}

/**
 * Well-known actor stats that are fundamental to the game system.
 * These are a subset of all possible stats (which are defined in the taxonomy).
 * These represent the core stats that are always present and have special meaning.
 */
export enum ActorStat {
  /**
   * Strength. Physical power and raw force. Affects:
   * - Heavy weapon effectiveness
   * - Athletic feats requiring force
   * - Carrying capacity
   */
  STR = 'str',

  /**
   * Dexterity. Fine motor control and precision. Affects:
   * - Precise weapon effectiveness
   * - Delicate manual tasks
   * - Crafting quality
   */
  DEX = 'dex',

  /**
   * Agility. Speed, grace, and coordination. Affects:
   * - Movement speed and evasion
   * - Initiative in combat, together with WIS
   * - Athletic feats requiring agility
   */
  AGI = 'agi',

  /**
   * Constitution. Physical resilience and endurance. Affects:
   * - Health points and injury resistance
   * - Stamina and fatigue resistance
   * - Resistance to poison, disease, and physical afflictions
   */
  CON = 'con',

  /**
   * Intelligence. Reasoning ability and learning capacity. Affects:
   * - Rate of experience gain (PXP→XP conversion)
   * - Complex abilities and higher learning
   * - Problem-solving and analysis
   */
  INT = 'int',

  /**
   * Wisdom. Awareness, intuition, and mental fortitude. Affects:
   * - Initiative in combat, together with Agility
   * - Detecting deception and hidden threats
   * - Resistance to fear, confusion, and mental effects
   * - Situational awareness and gut instincts
   */
  WIS = 'wis',

  /**
   * Presence. Force of personality and social influence. Affects:
   * - All social interactions and negotiations
   * - Leadership and group coordination
   * - Intimidation and commanding respect
   */
  PRS = 'prs',

  /**
   * Luck. Fortune and supernatural favor. Affects:
   * - Critical successes and failure avoidance
   * - Rare item discovery and advantageous encounters
   * - Quest opportunities and serendipitous events
   */
  LCK = 'lck',

}

/**
 * Map of actor stats to their values
 */
export type ActorStats = Record<typeof ActorStat[keyof typeof ActorStat], ModifiableScalarAttribute>;
export type EquipmentSlots = Partial<Record<ItemURN, 1>>;
export type Equipment = Partial<Record<Taxonomy.Anatomy, EquipmentSlots>>;
export type Skills = Partial<Record<Taxonomy.Skills, SkillState>>;
export type Membership = { role: string; ts: number; duration?: number };
export type Memberships = Partial<Record<Taxonomy.Factions, Membership>>;
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
 * The input type for creating a new Actor, containing only the required fields
 * that need to be provided when creating an Actor.
 */
export type ActorInput = {
  name?: string;
  description?: string;
  location?: PlaceURN;
  subtype?: ActorType;
};

/**
 * An actor is any kind of entity that has the ability to act "autonomously" in the world.
 * Actors are of different `subtype`s, like `pc`, `npc`, `monster`.
 * Our system treats all actors uniformly.
 */
export type Actor =
  & AbstractEntity<EntityType.ACTOR>
  & Describable
  & {

  /**
   * Actor subtype; for discriminating between different types of actors when we need to
   * Examples: `pc`, `npc`, `monster`
   */
  subtype: ActorType;

  /**
   * Current location
   */
  location: SymbolicLink<EntityType.PLACE>;

  /**
   * Optional party membership; places this actor in a party with other actors
   */
  party?: GroupSymbolicLink<GroupType.PARTY>;

  /**
   * Character level. e.g., "You are a 5th level barbarian."
   */
  level: ModifiableScalarAttribute;

  /**
   * Hit points. When this reaches 0, the actor is usually considered dead.
   */
  hp: ModifiableBoundedAttribute;

  /**
   * Traits that may affect the actor's rolls
   */
  traits: Traits;

  /**
   * Intrinsic attributes of the actor, like strength, dexterity, etc.
   */
  stats: ActorStats;

  /**
   * Injuries to the actor's body
   */
  injuries: Injuries;

  /**
   * The various "mana" or "energy" reserves of the actor
   */
  mana: ManaPools;

  /**
   * Effects that are currently applied to the actor. Buffs/debuffs, etc.
   */
  effects: AppliedEffects;

  /**
   * The actor's inventory of items
   */
  inventory: Inventory;

  /**
   * The subset of the actor's inventory that is equipped
   */
  equipment: Equipment;

  /**
   * Money balances by various currencies
   */
  wallet: Wallet;

  /**
   * Membership in various factions
   */
  memberships: Memberships;

  /**
   * This is a measure of the actor's standing with *us*, the game developer.
   * If the actor is a good citizen, then the score approaches 1.
   * If the actor is a bad citizen, then the score approaches -1.
   */
  reputation: NormalizedBipolarValue;

  /**
   * The actor's skills, including progression state
   * Skills completely determine the set of abilities available to an actor
   */
  skills: Skills;

  /**
   * The subset of skills that the actor has specialized
   */
  specializations: Specializations;
};
