import { Taxonomy, ModifiableBoundedAttribute } from '~/types';

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
export type CharacterSkillRecord = Record<Taxonomy.Skills, SkillState>;

/**
 * Skill priority classification for a character
 */
export enum SkillPriority {
  PRIMARY = 'primary',     // Skills the character focuses on most (2x multiplier)
  SECONDARY = 'secondary', // Skills of moderate focus (1.25x multiplier)
  TERTIARY = 'tertiary'    // Skills of least focus (1x multiplier)
}

/**
 * Multipliers for different skill priorities
 */
export const PRIORITY_MULTIPLIERS = {
  [SkillPriority.PRIMARY]: 1.0,
  [SkillPriority.SECONDARY]: 0.618,
  [SkillPriority.TERTIARY]: 0.382,
};

/**
 * Primary skill domains - fundamental categories
 */
export namespace Domain {
  export const COMBAT = 'combat' as const;
  export const TECH = 'tech' as const;
  export const SOCIAL = 'social' as const;
  export const KNOWLEDGE = 'knowledge' as const;
  export const MOVEMENT = 'movement' as const;
  export const CREATION = 'creation' as const;
}

/**
 * Skill specializations - specific applications within domains
 */
export namespace Specialization {
  // Combat specializations
  export const MELEE = 'melee' as const;
  export const RANGED = 'ranged' as const;
  export const DEFENSE = 'defense' as const;
  export const TACTICS = 'tactics' as const;

  // Tech specializations
  export const HACKING = 'hacking' as const;
  export const CYBERNETICS = 'cybernetics' as const;
  export const ELECTRONICS = 'electronics' as const;
  export const ROBOTICS = 'robotics' as const;

  // Social specializations
  export const PERSUASION = 'persuasion' as const;
  export const DECEPTION = 'deception' as const;
  export const INTIMIDATION = 'intimidation' as const;
  export const INSIGHT = 'insight' as const;

  // Knowledge specializations
  export const SCIENCE = 'science' as const;
  export const MEDICINE = 'medicine' as const;
  export const ENGINEERING = 'engineering' as const;
  export const SECURITY = 'security' as const;

  // Movement specializations
  export const STEALTH = 'stealth' as const;
  export const ATHLETICS = 'athletics' as const;
  export const PILOTING = 'piloting' as const;
  export const NAVIGATION = 'navigation' as const;

  // Creation specializations
  export const CRAFTING = 'crafting' as const;
  export const REPAIR = 'repair' as const;
  export const AUGMENTATION = 'augmentation' as const;
  export const CHEMISTRY = 'chemistry' as const;
}
