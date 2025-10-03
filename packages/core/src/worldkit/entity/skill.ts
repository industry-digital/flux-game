import { AbilityType } from '~/types/schema/ability';
import { Stat } from '~/types/entity/actor';
import { SkillSchema } from '~/types/schema/skill';
import { SpecialDuration } from '~/types/world/time';
import { createEffectUrn } from '~/lib/taxonomy';

const Evasion: SkillSchema = {
  id: 'flux:skill:evasion',
  name: 'Evasion',
  description: 'The practice of avoiding incoming attacks through movement and positioning. Practitioners develop reflexive responses that activate automatically when threatened.',
  stats: [Stat.FIN],
  milestones: [
    [10, [
      {
        name: 'Basic Avoidance',
        description: 'Reactive: Automatically attempt to avoid attacks when movement space is available',
        requirements: {
          "flux:stat:agi": 10,
        },
        type: AbilityType.REACTIVE,
        effects: [
          {
            type: createEffectUrn('dodge', 'bonus'),
            duration: SpecialDuration.PERMANENT,
            summary: '+2 to dodge rolls',
          }
        ],
      }
    ]],

  ]
};
