import { SkillURN } from '~/types/taxonomy';
import { Stat } from '~/types/entity/actor';
import { AbilityInContainment } from '~/types/schema/ability';

/**
 * A skill progression milestone is a tuple of a level and a list of abilities that become available at that level.
 */
export type ProgressionMilestone = [level: number, abilities: AbilityInContainment[]];

export type SkillSchema = {

  /**
   * The URN of the skill
   */
  id: SkillURN;

  /**
    * The name of the skill
    */
  name: string;

  /**
   * A description of the skill
   */
  description: string;

  /**
   * A skill may have an affinity with up to two stats.
   * Such stats are used to determine the skill's effectiveness.
   * Skills may implement stat affinities any way they want.
   * Examples:
   * - Weapon skills might haven an affinity with either`STR` or `DEX`, depending on the kindof weapon it is
   * - Ranged combat has an intrinsic affinity to the `DEX` stat
   * - Stealth has an intrinsic affinity to the `AGI` stat
   * - "Magic", or "tech", might have an affinity with the `INT` stat
   */
  stats: [] | [Stat] | [Stat, Stat];

  /**
   * The various abilities that are available at different levels of the skill
   */
  milestones: ProgressionMilestone[];
};
