import { Taxonomy } from '~/types/taxonomy';

/**
 * Represents the current state of a character's skill
 */
export type SkillState = {
  /**
   * A higher rank in a skill means it's more effective
   * Sometimes gaining a rank means gaining new abilities
   */
  rank: number;

  /**
   * Permanently acquired experience in this skill
   * Directly used to compute skill `rank` (above)
   */
  xp: number;

  /**
   * Potential experience not yet converted to `xp`
   */
  pxp: number;
}

/**
 * Type definition for a character's skill collection
 */
export type CharacterSkillRecord = Partial<Record<Taxonomy.Skills, SkillState>>;
