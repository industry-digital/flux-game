import { RollResult } from '~/types/dice';
import { SkillRankDictionary } from '~/types/entity/skill';
import { ActorURN, SessionURN, WeaponSchemaURN } from '~/types/taxonomy';

export type CombatantData = {
  actor: ActorURN;
  weapon: WeaponSchemaURN | 'flux:schema:weapon:none';
  skills: SkillRankDictionary;
  initiative: RollResult;
  joinedAtRound: number;
};

export type CombatSessionDidStartData = {
  session: SessionURN;
  combatants: Record<ActorURN, CombatantData>;
};
