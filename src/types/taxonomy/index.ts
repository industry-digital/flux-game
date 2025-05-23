import { ROOT_NAMESPACE } from '@flux/constants';
import { EntityType } from '@flux/entity/entity';

export type RootNamespace = typeof ROOT_NAMESPACE;

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
export const TAXONOMY: FlatTaxonomy = {
  namespace: ROOT_NAMESPACE,
  terms: {
    'place': {
      description: 'A location in the game world',
      examples: [
        'flux:place:nightcity', 'flux:place:wasteland:north']
    },
    'character': {
      description: 'Entities with agency in the game world',
      examples: ['flux:character:pc:123', 'flux:character:npc:vendor']
    },
    'stat': {
      description: 'Character attributes and statistics',
      examples: ['flux:stat:str', 'flux:stat:agi']
    },
    'item': {
      description: 'Objects that can be interacted with',
      examples: ['flux:item:weapon:sword', 'flux:item:consumable:potion']
    },
    'skill': {
      description: 'Character abilities',
      examples: ['flux:skill:combat:melee', 'flux:skill:survival:stealth']
    },
    'effect': {
      description: 'Status effects and conditions',
      examples: ['flux:effect:dot:burning', 'flux:effect:buff:haste']
    },
    'direction': {
      description: 'Directional indicators for navigation',
      examples: ['flux:direction:north', 'flux:direction:up']
    },
    'anatomy': {
      description: 'Body parts and locations',
      examples: ['flux:anatomy:human:arm:hand', 'flux:anatomy:dragon:wing']
    },
    'damage': {
      description: 'Types of damage',
      examples: ['flux:damage:physical:slash', 'flux:damage:elemental:fire']
    },
    'faction': {
      description: 'Political and social groups',
      examples: ['flux:faction:guild:thieves', 'flux:faction:kingdom:eldoria']
    },
    'topic': {
      description: 'Conversation topics',
      examples: ['flux:topic:quest:main', 'flux:topic:lore:history']
    },
    'trait': {
      description: 'Character traits and properties',
      examples: ['flux:trait:ironborn', 'flux:trait:undead']
    },
    'modifier': {
      description: 'Stat modifiers and adjustments',
      examples: ['flux:modifier:combat:flanking', 'flux:modifier:racial:furious']
    },
    'mana': {
      description: 'Energy types used for abilities',
      examples: ['flux:mana:fire', 'flux:mana:discipline']
    },
    'ability': {
      description: 'Special character abilities',
      examples: ['flux:ability:stealth:shadowmeld', 'flux:ability:magic:fireball']
    },
    'pref': {
      description: 'User preferences and settings',
      examples: ['flux:pref:pvp:allow', 'flux:pref:drag:disallow']
    },
    'collection': {
      description: 'A group of related entities',
      examples: ['flux:collection:map:items', 'flux:collection:list:players']
    },

    'character:pc': {
      description: 'Player characters'
    },
    'character:npc': {
      description: 'Non-player characters'
    },

    'item:weapon': {
      description: 'Items used for combat'
    },
    'item:armor': {
      description: 'Protective equipment'
    },
    'item:consumable': {
      description: 'Single-use items'
    },
    'item:container': {
      description: 'Items that can store other items'
    },
  }
};

// Get all root vocabularies at compile time
export type RootVocabulary = {
  [K in keyof typeof TAXONOMY.terms]: K extends `${string}:${string}` ? never : K
}[keyof typeof TAXONOMY.terms];

export type TaxonomyURN<Vocabulary extends RootVocabulary> = `${RootNamespace}:${Vocabulary}:${string}`;

// Generate taxonomy namespace
export namespace Taxonomy {
  // Generate specific vocabulary types
  export type Places = TaxonomyURN<'place'>;
  export type Characters = TaxonomyURN<'character'>;
  export type Stats = TaxonomyURN<'stat'>;
  export type Items = TaxonomyURN<'item'>;
  export type Weapons = TaxonomyURN<'weapon'>;
  export type Armor = TaxonomyURN<'armor'>;
  export type Skills = TaxonomyURN<'skill'>;
  export type Effects = TaxonomyURN<'effect'>;
  export type Directions = TaxonomyURN<'direction'>;
  export type Anatomy = TaxonomyURN<'anatomy'>;
  export type Damage = TaxonomyURN<'damage'>;
  export type Factions = TaxonomyURN<'faction'>;
  export type Topics = TaxonomyURN<'topic'>;
  export type Traits = TaxonomyURN<'trait'>;
  export type Modifiers = TaxonomyURN<'modifier'>;
  export type Mana = TaxonomyURN<'mana'>;
  export type Abilities = TaxonomyURN<'ability'>;
  export type Preferences = TaxonomyURN<'pref'>;
  export type Collections = TaxonomyURN<'collection'>;
  export type Ammo = TaxonomyURN<'ammo'>;
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
