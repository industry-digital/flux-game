import { SkillURN } from '~/types/taxonomy';
import { CharacterStatName } from '~/types/entity/character';

export type SkillSchema = {
  id: SkillURN
  name: string;
  description: string;
  stats: [] | [CharacterStatName] | [CharacterStatName, CharacterStatName];
};
