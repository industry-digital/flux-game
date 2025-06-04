import { Taxonomy, } from '~/types/taxonomy';
import { ModifiableBoundedAttribute } from '~/types/entity/attribute';
import { GOLDEN_RATIO } from '~/types/world/constants';
import { createSkillUrn } from '~/lib/taxonomy';

/**
 * Represents the current state of a character's skill
 */
export interface SkillState {
  /** Permanently acquired experience in this skill */
  xp: number;
  /** Potential experience not yet converted to `xp` */
  pxp: number;
  /** Concentration pool for this skill (influenced by affinity stat) */
  conc: ModifiableBoundedAttribute;
  /** Last touched timestamp for this skill */
  ts: number;
}

/**
 * Type definition for a character's skill collection
 */
export type CharacterSkillRecord = Partial<Record<Taxonomy.Skills, SkillState>>;

/**
 * Skill priority classification for a character
 */
export enum SkillPriority {
  PRIMARY = 'primary',     // Skills the character focuses on most (2.0x multiplier)
  SECONDARY = 'secondary', // Skills of moderate focus (1.38x multiplier)
  TERTIARY = 'tertiary'    // Skills of least focus (1.0x multiplier)
}

/**
 * Multipliers for different skill priorities - using golden ratio relationships
 */
export const PRIORITY_MULTIPLIERS = {
  [SkillPriority.PRIMARY]: 1.0,
  [SkillPriority.SECONDARY]: 1 / GOLDEN_RATIO,
  [SkillPriority.TERTIARY]:  1 / GOLDEN_RATIO ** 2,
} as const;

/**
 * Core skill URNs aligned with your taxonomy
 * These correspond to the skills defined in your skills.md catalog
 */
export const SKILLS = {
  // Weapon skills
  WEAPON_MELEE_SLASH_HEAVY: createSkillUrn('weapon', 'melee', 'slash', 'heavy'),
  WEAPON_MELEE_SLASH_LIGHT: createSkillUrn('weapon', 'melee', 'slash', 'light'),
  WEAPON_MELEE_CRUSH_HEAVY: createSkillUrn('weapon', 'melee', 'crush', 'heavy'),
  WEAPON_MELEE_CRUSH_LIGHT: createSkillUrn('weapon', 'melee', 'crush', 'light'),
  WEAPON_MELEE_PIERCE_HEAVY: createSkillUrn('weapon', 'melee', 'pierce', 'heavy'),
  WEAPON_MELEE_PIERCE_LIGHT: createSkillUrn('weapon', 'melee', 'pierce', 'light'),
  WEAPON_THROWN_LIGHT: createSkillUrn('weapon', 'thrown', 'light'),
  WEAPON_THROWN_HEAVY: createSkillUrn('weapon', 'thrown', 'heavy'),
  WEAPON_GUN_PISTOL: createSkillUrn('weapon', 'gun', 'pistol'),
  WEAPON_GUN_SMG: createSkillUrn('weapon', 'gun', 'smg'),
  WEAPON_GUN_RIFLE: createSkillUrn('weapon', 'gun', 'rifle'),
  WEAPON_GUN_SHOTGUN: createSkillUrn('weapon', 'gun', 'shotgun'),
  WEAPON_HEAVY: createSkillUrn('weapon', 'heavy'),
  WEAPON_ENERGY_DIRECTED: createSkillUrn('weapon', 'energy', 'directed'),
  WEAPON_ENERGY_AOE: createSkillUrn('weapon', 'energy', 'aoe'),
  WEAPON_EXPLOSIVE: createSkillUrn('weapon', 'explosive'),
  WEAPON_DRONE: createSkillUrn('weapon', 'drone'),

  // Defense skills
  DEFENSE_ARMOR: createSkillUrn('defense', 'armor'),
  DEFENSE_EVADE: createSkillUrn('defense', 'evade'),
  DEFENSE_BLOCK: createSkillUrn('defense', 'block'),
  DEFENSE_PARRY: createSkillUrn('defense', 'parry'),
  DEFENSE_TECH: createSkillUrn('defense', 'tech'),

  // Knowledge skills
  KNOWLEDGE_TECH: createSkillUrn('knowledge', 'tech'),
  KNOWLEDGE_SCIENCE: createSkillUrn('knowledge', 'science'),
  KNOWLEDGE_MEDICINE: createSkillUrn('knowledge', 'medicine'),
  KNOWLEDGE_ENGINEERING: createSkillUrn('knowledge', 'engineering'),
  KNOWLEDGE_HISTORY: createSkillUrn('knowledge', 'history'),

  // Social skills
  SOCIAL_INFLUENCE: createSkillUrn('social', 'influence'),
  SOCIAL_POLITICS: createSkillUrn('social', 'politics'),
  SOCIAL_ADMIN: createSkillUrn('social', 'admin'),
  SOCIAL_INSIGHT: createSkillUrn('social', 'insight'),

  // Commerce skills
  COMMERCE_APPRAISAL: createSkillUrn('commerce', 'appraisal'),
  COMMERCE_ACCOUNTING: createSkillUrn('commerce', 'accounting'),
  COMMERCE_TRANSACTING: createSkillUrn('commerce', 'transacting'),
  COMMERCE_LOGISTICS: createSkillUrn('commerce', 'logistics'),

  // Survival skills
  SURVIVAL_ATHLETICS: createSkillUrn('survival', 'athletics'),
  SURVIVAL_STEALTH: createSkillUrn('survival', 'stealth'),
  SURVIVAL_PERCEPTION: createSkillUrn('survival', 'perception'),
  SURVIVAL_FIELDCRAFT: createSkillUrn('survival', 'fieldcraft'),
  SURVIVAL_NAVIGATION: createSkillUrn('survival', 'navigation'),
  SURVIVAL_TRACKING: createSkillUrn('survival', 'tracking'),
  SURVIVAL_COOKING: createSkillUrn('survival', 'cooking'),
  SURVIVAL_SKINNING: createSkillUrn('survival', 'skinning'),
  SURVIVAL_FISHING: createSkillUrn('survival', 'fishing'),

  // Craft skills
  CRAFT_WEAPON: createSkillUrn('craft', 'weapon'),
  CRAFT_ARMOR: createSkillUrn('craft', 'armor'),
  CRAFT_TECH: createSkillUrn('craft', 'tech'),
  CRAFT_MEDICINE: createSkillUrn('craft', 'medicine'),
  CRAFT_SURVIVAL: createSkillUrn('craft', 'survival'),
} as const;

/**
 * Skill domains for categorization and UI organization
 */
export const SKILL_DOMAINS = {
  WEAPON: [
    SKILLS.WEAPON_MELEE_SLASH_HEAVY,
    SKILLS.WEAPON_MELEE_SLASH_LIGHT,
    SKILLS.WEAPON_MELEE_CRUSH_HEAVY,
    SKILLS.WEAPON_MELEE_CRUSH_LIGHT,
    SKILLS.WEAPON_MELEE_PIERCE_HEAVY,
    SKILLS.WEAPON_MELEE_PIERCE_LIGHT,
    SKILLS.WEAPON_THROWN_LIGHT,
    SKILLS.WEAPON_THROWN_HEAVY,
    SKILLS.WEAPON_GUN_PISTOL,
    SKILLS.WEAPON_GUN_SMG,
    SKILLS.WEAPON_GUN_RIFLE,
    SKILLS.WEAPON_GUN_SHOTGUN,
    SKILLS.WEAPON_HEAVY,
    SKILLS.WEAPON_ENERGY_DIRECTED,
    SKILLS.WEAPON_ENERGY_AOE,
    SKILLS.WEAPON_EXPLOSIVE,
    SKILLS.WEAPON_DRONE,
  ],
  DEFENSE: [
    SKILLS.DEFENSE_ARMOR,
    SKILLS.DEFENSE_EVADE,
    SKILLS.DEFENSE_BLOCK,
    SKILLS.DEFENSE_PARRY,
    SKILLS.DEFENSE_TECH,
  ],
  KNOWLEDGE: [
    SKILLS.KNOWLEDGE_TECH,
    SKILLS.KNOWLEDGE_SCIENCE,
    SKILLS.KNOWLEDGE_MEDICINE,
    SKILLS.KNOWLEDGE_ENGINEERING,
  ],
  SOCIAL: [
    SKILLS.SOCIAL_INFLUENCE,
    SKILLS.SOCIAL_POLITICS,
    SKILLS.SOCIAL_ADMIN,
    SKILLS.SOCIAL_INSIGHT,
  ],
  COMMERCE: [
    SKILLS.COMMERCE_APPRAISAL,
    SKILLS.COMMERCE_ACCOUNTING,
    SKILLS.COMMERCE_TRANSACTING,
    SKILLS.COMMERCE_LOGISTICS,
  ],
  SURVIVAL: [
    SKILLS.SURVIVAL_ATHLETICS,
    SKILLS.SURVIVAL_STEALTH,
    SKILLS.SURVIVAL_PERCEPTION,
    SKILLS.SURVIVAL_FIELDCRAFT,
  ],
  CRAFT: [
    SKILLS.CRAFT_WEAPON,
    SKILLS.CRAFT_ARMOR,
    SKILLS.CRAFT_TECH,
    SKILLS.CRAFT_MEDICINE,
    SKILLS.CRAFT_SURVIVAL,
  ],
} as const;

/**
 * Type-safe way to get all skills from a domain
 */
export type SkillDomain = keyof typeof SKILL_DOMAINS;
export type SkillsInDomain<D extends SkillDomain> = typeof SKILL_DOMAINS[D][number];

export type SpecializationGroup = Partial<Record<Taxonomy.Skills, number>>;

export type Specializations = {
  primary: SpecializationGroup;
  secondary: SpecializationGroup;
};
