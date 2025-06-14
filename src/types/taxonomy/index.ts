import { EntityType } from '~/types/entity/entity';

export const ROOT_NAMESPACE = 'flux' as const;
export type RootNamespace = typeof ROOT_NAMESPACE;

export type Intrinsic = 'intrinsic';

/**
 * The complete taxonomy registry with flat term structure
 */
export type FlatTaxonomy = {
  // The root namespace (e.g., 'flux')
  namespace: string;

  // Flat list of all taxonomy terms
  terms: Record<string, TaxonomyTerm>;
}

/**
 * Represents a single taxonomy term
 */
export type TaxonomyTerm = {
  // Human-readable description
  description: string;

  // Example URNs using this term (optional)
  examples?: string[];
}

/**
 * The Flux taxonomy registry as a flat structure
 */
export const TAXONOMY = {
  namespace: ROOT_NAMESPACE,
  terms: {
    place: {
      description: 'A location in the game world',
      examples: ['flux:place:nightcity', 'flux:place:wasteland:north']
    },
    char: {
      description: 'A character in the game world',
      examples: ['flux:char:pc:123', 'flux:char:npc:vendor']
    },
    stat: {
      description: 'A character or item statistic',
      examples: ['flux:stat:str', 'flux:stat:agi']
    },
    item: {
      description: 'An item that can be obtained and used',
      examples: ['flux:item:weapon:sword', 'flux:item:consumable:potion']
    },
    skill: {
      description: 'A learnable ability or proficiency',
      examples: ['flux:skill:combat:melee', 'flux:skill:survival:stealth']
    },
    effect: {
      description: 'A temporary or permanent effect',
      examples: ['flux:effect:dot:burning', 'flux:effect:buff:haste']
    },
    direction: {
      description: 'A cardinal or relative direction',
      examples: ['flux:direction:north', 'flux:direction:up']
    },
    anatomy: {
      description: 'Body parts and physical features',
      examples: ['flux:anatomy:human:arm:hand', 'flux:anatomy:dragon:wing']
    },
    damage: {
      description: 'Types of damage that can be dealt',
      examples: ['flux:damage:physical:slash', 'flux:damage:elemental:fire']
    },
    faction: {
      description: 'Groups and organizations',
      examples: ['flux:faction:guild:thieves', 'flux:faction:kingdom:eldoria']
    },
    topic: {
      description: 'Conversation and quest topics',
      examples: ['flux:topic:quest:main', 'flux:topic:lore:history']
    },
    trait: {
      description: 'Inherent characteristics',
      examples: ['flux:trait:ironborn', 'flux:trait:undead']
    },
    modifier: {
      description: 'Things that modify other things',
      examples: ['flux:modifier:combat:flanking', 'flux:modifier:racial:furious']
    },
    mana: {
      description: 'Types of magical energy',
      examples: ['flux:mana:fire', 'flux:mana:discipline']
    },
    ability: {
      description: 'Special actions that can be performed',
      examples: ['flux:ability:stealth:shadowmeld', 'flux:ability:magic:fireball']
    },
    pref: {
      description: 'User preferences and settings',
      examples: ['flux:pref:pvp:allow', 'flux:pref:drag:disallow']
    },
    group: {
      description: 'Collections of related items',
      examples: ['flux:group:map:items', 'flux:group:list:players']
    },
    weapon: {
      description: 'Items used for combat'
    },
    armor: {
      description: 'Protective equipment'
    },
    ammo: {
      description: 'Ammunition and projectiles'
    },
    timer: {
      description: 'Time tracking and scheduling'
    },
    dimension: {
      description: 'Measurement and quantification'
    },
    currency: {
      description: 'The various currencies in the game world',
      examples: ['flux:currency:gold', 'flux:currency:silver']
    }
  }
} as const;

// Get all root vocabularies at compile time
export type RootVocabulary = keyof typeof TAXONOMY.terms;

export type TaxonomyURN<
  Vocabulary extends RootVocabulary = RootVocabulary,
> = `${RootNamespace}:${Vocabulary}:${string}`;

export namespace Taxonomy {

  /**
   * The various Places of the game world
   */
  export type Places = TaxonomyURN<'place'>;

  /**
   * Characters of the game world
   */
  export type Characters = TaxonomyURN<'char'>;

  /**
   * Character stats
   */
  export type Stats = TaxonomyURN<'stat'>;

  /**
   * Kinds of skills
   */
  export type Skills = TaxonomyURN<'skill'>;

  /**
   * The various kinds of in-game effects that can be applied to things
   */
  export type Effects = TaxonomyURN<'effect'>;

  /**
   * Anatomical parts and locations
   */
  export type Anatomy = TaxonomyURN<'anatomy'>;

  /**
   * Kinds of items
   */
  export type Items = TaxonomyURN<'item'>;

  /**
   * Kinds of weapons
   */
  export type Weapons = TaxonomyURN<'weapon'>;

  /**
   * Kinds of armor
   */
  export type Armor = TaxonomyURN<'armor'>;

  /**
   * The various directions of the game world ("up", "down", "north", etc.)
   */
  export type Directions = TaxonomyURN<'direction'>;

  /**
   * The various kinds of damage that can be inflicted
   */
  export type Damage = TaxonomyURN<'damage'>;

  /**
   * The various well-known groups in the game world
   */
  export type Factions = TaxonomyURN<'faction'>;

  /**
   * The various topics that can be discussed or explored
   */
  export type Topics = TaxonomyURN<'topic'>;

  /**
   * The various kinds of traits that can be applied to characters or items
   */
  export type Traits = TaxonomyURN<'trait'>;

  /**
   * The various kinds of modifiers that can affect stats or abilities
   */
  export type Modifiers = TaxonomyURN<'modifier'>;

  /**
   * The various kinds of mana or energy used in the game
   */
  export type Mana = TaxonomyURN<'mana'>;

  /**
   * Special abilities that characters can use
   */
  export type Abilities = TaxonomyURN<'ability'>;

  /**
   * User preferences and settings
   */
  export type Preferences = TaxonomyURN<'pref'>;

  /**
   * Groups of things
   */
  export type Groups = TaxonomyURN<'group'>;

  /**
   * Kinds of ammo
   */
  export type Ammo = TaxonomyURN<'ammo'>;

  /**
   * The various kinds of timers used in the simulation
   */
  export type Timers = TaxonomyURN<'timer'>;

  /**
   * The various ways to measure or quantify something in the game world.
   */
  export type Dimensions = TaxonomyURN<'dimension'>;

  export type Currency = TaxonomyURN<'currency'>;
}

export type EntityURN<T extends EntityType = EntityType> = `${RootNamespace}:${T}:${string}`;
export type PlaceURN = Taxonomy.Places;
export type CharacterURN = Taxonomy.Characters;
export type TraitURN = Taxonomy.Traits;
export type AbilityURN = Taxonomy.Abilities;
export type SkillURN = Taxonomy.Skills;
export type EffectURN = Taxonomy.Effects;
export type DirectionURN = Taxonomy.Directions;
export type WeaponURN = Taxonomy.Weapons;
export type ArmorURN = Taxonomy.Armor;
export type ItemURN = Taxonomy.Items;
export type AnatomyURN = Taxonomy.Anatomy;
export type ModifierURN = Taxonomy.Modifiers;
export type TimerURN = Taxonomy.Timers;
export type AmmoURN = Taxonomy.Ammo;
export type DimensionURN = Taxonomy.Dimensions;
export type StatURN = Taxonomy.Stats;
export type GroupURN = Taxonomy.Groups;
