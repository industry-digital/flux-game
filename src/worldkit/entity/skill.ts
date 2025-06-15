import { AbilityType, ActorStat, createEffectUrn, SkillSchema, SpecialDuration, TargetType } from '@flux';

const Evasion: SkillSchema = {
  id: 'flux:skill:combat:defense:evasion',
  name: 'Evasion',
  description: 'The practice of avoiding incoming attacks through movement and positioning. Practitioners develop reflexive responses that activate automatically when threatened.',
  stats: [ActorStat.AGI],
  milestones: [
    [10, [
      {
        name: 'Basic Avoidance',
        description: 'Reactive: Automatically attempt to avoid attacks when movement space is available',
        requirements: {
          "flux:stat:agi": 10,
        },
        type: AbilityType.REACTIVE,
        targeting: {
          type: TargetType.SELF,
          range: 0,
          requirements: {},
        },
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
