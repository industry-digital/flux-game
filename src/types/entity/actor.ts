import { Taxonomy, ItemURN, PlaceURN, ActorURN, GroupURN, BehaviorURN } from '~/types/taxonomy';
import { AppliedEffects } from '~/types/taxonomy/effect';
import { EntityType, AbstractEntity, Describable } from '~/types/entity/entity';
import { SkillState, Specializations } from '~/types/entity/skill';
import { ItemState } from '~/types/entity/item';
import {
  NormalizedValueBetweenZeroAndOne,
  ModifiableBoundedAttribute,
  ModifiableScalarAttribute,
  NormalizedBipolarValue,
} from '~/types/entity/attribute';

/**
 * The kinds of actors in the simulation
 */
export enum ActorType {
  /**
   * Player character
   */
  PC = 'pc',

  /**
   * Hostile creature or monster
   */
  CREATURE = 'creature',
}

/**
 * Well-known actor stats that are fundamental to the game system.
 * These are a subset of all possible stats (which are defined in the taxonomy).
 * These represent the core stats that are always present and have special meaning.
 */
export enum ActorStat {
  /**
   * Strength. Physical power and raw force. Affects:
   * - Effectiveness of heavy weapons
   * - Athletic feats requiring force
   * - Carrying capacity
   */
  STR = 'str',

  /**
   * Dexterity. Fine motor control and precision. Affects:
   * - Effectiveness of precision weapons
   * - Delicate manual tasks
   * - Crafting quality
   */
  DEX = 'dex',

  /**
   * Agility. Speed, grace, and coordination. Affects:
   * - Movement speed and evasion
   * - Athletic feats requiring finesse
   */
  AGI = 'agi',

  /**
   * Constitution. Physical resilience and endurance. Affects:
   * - Health points and injury resistance
   * - Stamina and fatigue resistance
   * - Resistance to poison, disease
   */
  CON = 'con',

  /**
   * Intelligence. Reasoning ability and learning capacity. Affects:
   * - Rate of experience gain (PXP→XP conversion)
   */
  INT = 'int',

  /**
   * Perception. Awareness and intuition.
   * - Directly affects the actor's ability to perceive the world around them, including the ability to detect hidden things
   * - Initiative in combat
   * - Directly affects rate at which PXP is gained
   */
  PER = 'per',

  /**
   * Memory. The actor's ability to remember things.
   * - Directly affects the number of abilities the actor can hold in their head at once
   * - Directly affects size of PXP pool
   */
  MEM= 'mem',
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
  id?: ActorURN;
  name?: string;
  kind?: ActorType;
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
  kind: ActorType;

  /**
   * Current location
   */
  location: PlaceURN;

  /**
   * Optional party membership; places this actor in a party with other actors
   */
  party?: GroupURN;

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
  standing: NormalizedBipolarValue;

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

export type Autonomous = {
  needs: Needs;
  behaviors: Record<BehaviorURN, 1>;
};

/**
 * Resource-based needs that drive monster behavior
 * Needs are evaluated against available resources in the monster's current location
 */
export type Needs = {
  /**
   * Taxononomic atoms that the actor is interested in
   * @example `sing`, `dance`, `flutter``
   */
  social: string[];

  /**
   * Taxononomic atoms that the actor is interested in, relating to shelter
   * @example `cave`, `tree`, `rock`, etc.
   */
  shelter: string[];

  /**
   * Resources this monster requires, mapped to consumption rates and thresholds
   * Food resources are handled in this field
   * @example { `mushroom`: { consumption: 100, thresholds: { scarcity: 0.5, abundance: 0.8 }, search: { radius: 10 } } }
   */
  resources: Record<string, ResourceNeed>;
};

export type BehaviorThresholds = {
  scarcity: NormalizedValueBetweenZeroAndOne;
  abundance: NormalizedValueBetweenZeroAndOne;
};

export type SearchParameters  = {
  /**
   * How far the monster will travel to find this resource (in place-hops)
   */
  radius: number;
};

/**
 * A specific resource need with consumption patterns and behavioral thresholds
 */
export type ResourceNeed = {
  /**
   * How much of this resource the monster consumes per time period
   */
  consumption: number;

  /**
   * Behavioral thresholds for resource scarcity and abundance
   */
  thresholds: BehaviorThresholds;

  /**
   * How the monster will search for this resource
   */
  search: SearchParameters;
};

export type AbstractNonPlayerCharacter<T extends ActorType> = Autonomous & Actor & {
  kind: T;
};

export type Creature = AbstractNonPlayerCharacter<ActorType.CREATURE>;
