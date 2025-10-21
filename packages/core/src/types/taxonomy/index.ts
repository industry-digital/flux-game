import { EntityType } from '~/types/entity/entity';
import { Biome, Climate } from '~/types/schema/ecology';

export type URNLike = `${string}:${string}`;

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
    actor: {
      description: 'A character or monster in the game world',
      examples: ['flux:actor:pc:123', 'flux:actor:npc:the-ice-cream-man']
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
      description: 'Items used for combat',
      examples: ['flux:weapon:sword:longsword', 'flux:weapon:gun:pistol:9mm'],
    },
    armor: {
      description: 'Protective equipment',
      examples: ['flux:armor:helmet:steel', 'flux:armor:gundam:exia:head'],
    },
    ammo: {
      description: 'Ammunition and projectiles',
      examples: ['flux:ammo:bullet:9mm', 'flux:ammo:missile:rocket'],
    },
    timer: {
      description: 'Time tracking and scheduling',
      examples: ['flux:timer:weapon:setup', 'flux:timer:combat:roundtime'],
    },
    dimension: {
      description: 'Measurement and quantification',
      examples: ['flux:dimension:weight', 'flux:dimension:volume'],
    },
    currency: {
      description: 'The various currencies in the game world',
      examples: ['flux:currency:gold', 'flux:currency:silver'],
    },
    monster: {
      description: 'A monster in the game world',
      examples: ['flux:monster:goblin:blazor:elite', 'flux:monster:faction:arasaka:cybernetic:assassin'],
    },
    resource: {
      description: 'A resource that can be obtained and used',
      examples: ['flux:resource:wood:oak', 'flux:resource:ore:iron'],
    },
    eco: {
      description: 'Ecosystems and environments',
      examples: ['flux:eco:forest:temperate', 'flux:eco:desert:arid', 'flux:eco:tundra:polar']
    },
    schema: {
      description: 'The various schemas in the game world',
      examples: ['flux:schema:item:container:backpack', 'flux:schema:item:weapon:sword:elven-longsword']
    },
    behavior: {
      description: 'The various behaviors of actors',
      examples: ['flux:behavior:scarcity:aggressive', 'flux:behavior:scarcity:flee']
    },
    session: {
      description: 'Game sessions',
      examples: ['flux:session:combat:123']
    },
  },

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
   * Actors of the game world
   */
  export type Actors = TaxonomyURN<'actor'>;

  /**
   * Actor stats
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
   * The various kinds of traits that can be applied to actors or items
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
   * Special abilities that actors can use
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

  /**
   * The various currencies in the game world
   */
  export type Currency = TaxonomyURN<'currency'>;

  /**
   * The various resources in the game world
   */
  export type Resources = TaxonomyURN<'resource'>;

  /**
   * Geographic and topographic features
   */
  export type Ecosystems = TaxonomyURN<'eco'>;

  /**
   * The various schemas in the game world
   */
  export type Schemas = TaxonomyURN<'schema'>;

  export type Behaviors = TaxonomyURN<'behavior'>;

  /**
   * The various game sessions
   */
  export type Sessions = TaxonomyURN<'session'>;
}

export type EntityURN<T extends EntityType = EntityType> = `${RootNamespace}:${T}:${string}`;
export type PlaceURN = Taxonomy.Places;
export type ActorURN = Taxonomy.Actors;
export type TraitURN = Taxonomy.Traits;
export type AbilityURN = Taxonomy.Abilities;
export type SkillURN = Taxonomy.Skills;
export type EffectURN = Taxonomy.Effects;
export type DirectionURN = Taxonomy.Directions;
export type AnatomyURN = Taxonomy.Anatomy;
export type ModifierURN = Taxonomy.Modifiers;
export type TimerURN = Taxonomy.Timers;
export type DimensionURN = Taxonomy.Dimensions;
export type StatURN = Taxonomy.Stats;
export type GroupType = 'party' | 'faction';
export type GroupURN<TGroupType extends GroupType = GroupType> = `${RootNamespace}:group:${TGroupType}:${string}`;
export type PartyURN = GroupURN<'party'>;
export type FactionURN = GroupURN<'faction'>;

// Backward compatibility - union of all group types
export type AnyGroupURN = Taxonomy.Groups;
export type TopicURN = Taxonomy.Topics;
export type ResourceURN = Taxonomy.Resources;
export type EcosystemURN = `${RootNamespace}:eco:${Biome}:${Climate}`;
export type ItemType = 'weapon' | 'armor' | 'ammo' | 'container' | 'resource' | 'mod' | 'device' | 'component';
export type ItemURN<TItemType extends ItemType = any> = `${RootNamespace}:item:${string}`;
/**
 * @deprecated Use ItemURN
 */
export type WeaponItemURN = ItemURN<'weapon'>;
/**
 * @deprecated Use ItemURN
 */
export type ArmorItemURN = ItemURN<'armor'>;
/**
 * @deprecated Use ItemURN
 */
export type AmmoItemURN = ItemURN<'ammo'>;
/**
 * @deprecated Use ItemURN
 */
export type ContainerItemURN = ItemURN<'container'>;
/**
 * @deprecated Use ItemURN
 */
export type ResourceItemURN = ItemURN<'resource'>;
/**
 * @deprecated Use BonusURN
 */
export type BonusURN = `${RootNamespace}:bonus:${string}`;

export type SchemaType = keyof Omit<typeof TAXONOMY.terms, 'schema'>;

// Item schemas - enforce category matching between schema and item URNs
export type SchemaHavingTypes = ItemType | 'modifier';
export type SchemaURN<TCategory extends SchemaHavingTypes = SchemaHavingTypes> = `${RootNamespace}:schema:${TCategory}:${string}`;

export type WeaponSchemaURN = SchemaURN<'weapon'>;
export type ArmorSchemaURN = SchemaURN<'armor'>;
export type AmmoSchemaURN = SchemaURN<'ammo'>;
export type ContainerSchemaURN = SchemaURN<'container'>;
export type ResourceSchemaURN = SchemaURN<'resource'>;
export type ModSchemaURN = SchemaURN<'mod'>;
export type DeviceSchemaURN = SchemaURN<'device'>;
export type ModifierSchemaURN = SchemaURN<'modifier'>;
export type ComponentSchemaURN = SchemaURN<'component'>;

// Non-item schemas (don't follow the category pattern)
export type AbilitySchemaURN = `${RootNamespace}:schema:ability:${string}`;
export type SkillSchemaURN = `${RootNamespace}:schema:skill:${string}`;
export type ActorSchemaURN = `${RootNamespace}:schema:actor:${string}`;
export type PlaceSchemaURN = `${RootNamespace}:schema:place:${string}`;

export type BehaviorURN = Taxonomy.Behaviors;
export type SessionURN = Taxonomy.Sessions;
