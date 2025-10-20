import { SkillSchemaURN } from '~/types/taxonomy';
import { AbilityInContainment } from '~/types/schema/ability';

/**
 * A skill progression milestone is a tuple of a level and a list of abilities that become available at that level.
 */
export type ProgressionMilestone = [level: number, abilities: AbilityInContainment[]];

export type SkillSchema = {

  /**
   * The URN of the skill
   */
  urn: SkillSchemaURN;

  /**
    * The name of the skill
    * @deprecated This will come from i18n instead
    */
  name?: string;

  /**
   * A description of the skill
    * @deprecated This will come from i18n instead
   */
  description?: string;

  /**
   * The various abilities that are available at different levels of the skill
   */
  milestones: Map<number, ProgressionMilestone>;
};
