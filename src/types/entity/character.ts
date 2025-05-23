import { Taxonomy, EntityURN } from '~/types/taxonomy';
import { EmergentNarrative, Entity, EntityType, SymbolicLink } from '~/types/entity/entity';
import { SkillState } from './skill';
import { AppliedEffect } from '~/types/effect';
import { ItemAttributes, ItemURN } from '~/types/entity/item';
import { AbilityState } from '~/types/entity/ability';
import { InteractiveSessionState } from '~/types/entity/session';
import {
  NormalizedValueBetweenZeroAndOne,
  ModifiableBoundedAttribute,
  ModifiableScalarAttribute,
  NormalizedBipolarValue,
} from '~/types/entity/attribute';
import { AppliedEffects } from '~/types/taxonomy/effect';

export enum CharacterStatName {
  STR = 'str',
  CON = 'con',
  AGI = 'agi',
  DEX = 'dex',
  SPD = 'spd',
  INT = 'int',
  WIS = 'wis',
  CHA = 'cha',
}

export type CharacterStats = Record<CharacterStatName, ModifiableScalarAttribute>;
export type EquipmentSlots = Partial<Record<ItemURN, 1>>;
export type Equipment = Partial<Record<Taxonomy.Anatomy, EquipmentSlots>>; // maps slot -> Item EntityID
export type Skills = Partial<Record<Taxonomy.Skills, SkillState>>;
export type CharacterEffect = AppliedEffect<EntityURN | Taxonomy.Skills>;
export type CharacterEffects = Partial<Record<string, CharacterEffect>>;
export type Membership = { role: string; ts: number; duration?: number };
export type Memberships = Partial<Record<Taxonomy.Factions, Membership>>;
export type Reputation = Partial<Record<Taxonomy.Factions, NormalizedBipolarValue>>;
export type Traits = Partial<Record<Taxonomy.Traits, 1>>;
export type Injuries = Partial<Record<Taxonomy.Anatomy, InjuryDescriptor>>;
export type ManaPools = Partial<Record<Taxonomy.Mana, ModifiableBoundedAttribute>>;
export type Subscriptions = Partial<Record<Taxonomy.Topics, 1>>;

export type Inventory = {
  /**
   * The total mass of the inventory, in grams. This is computed from the contents of the inventory itself.
   **/
  mass: number;
  /**
   * The last time the inventory was updated, expressed as milliseconds since the UNIX epoch
   */
  ts: number;

  items: Partial<Record<string, ItemAttributes<any>>>;
}

export enum CharacterCondition {
  ALIVE = 'alive',
  INCAPACITATED = 'incapacitated',
  DEAD = 'dead',
}

export type InjuryDescriptor = {
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

export type CharacterAttributes = {
  /**
   * Character level
   */
  level: number;

  /**
   * If the character is a member of a party, this is the ID of the party.
   */
  party?: SymbolicLink;

  /**
   * Health
   */
  hp: ModifiableBoundedAttribute;

  /**
   * Current mana
   */
  mana: ManaPools;

  /**
   * The character's current state of health, including injuries and other effects.
   */
  injuries: Injuries;

  /**
   * Mass of the character, in grams
   */
  mass: ModifiableScalarAttribute;

  /**
   * The current "condition" of the character
   */
  condition: CharacterCondition;

  /**
   * D&D style character stats
   */
  stats: CharacterStats;

  /**
   * What the character is currently wearing or wielding. This is a map of equipment slots to item IDs.
   */
  equipment: Equipment;

  /**
   * Traits are tags that flavor the Character.
   */
  traits: Traits;

  /**
   * The various skills the character has, and the level of experience in each.
   */
  skills: Skills;

  /**
   * The factions the character is a member of
   */
  memberships:  Memberships;

  reputation: Reputation;

  /**
   * The character's pubsub subscriptions.
   */
  subscriptions: Subscriptions;

  /**
   * The character's origin story, which can change over time.
   */
  origin: string | EmergentNarrative;

  /**
   * Effects that are currently affecting the character.
   */
  effects: AppliedEffects;

  /**
   * The character's personal effects, including equipped items, consumables, and other items.
   * `equipment` only contains references to items in the `inventory.
   */
  inventory: Inventory;

  /**
   * The state of the various abilities the character has.
   */
  abilities: Partial<Record<Taxonomy.Abilities, AbilityState>>;

  /**
   * If this is present, the character is in an interactive session.
   * In interactive session requires a character to make multiple decisions in a row within a bounded context.
   */
  session?: InteractiveSessionState;

  /**
   * Character's preferences
   * - `flux:pref:pvp:allow`
   * - `flux:pref:drag:allow`
   */
  preferences: Partial<Record<Taxonomy.Preferences, any>>;
};

export type Character = Entity<EntityType, CharacterAttributes>;
