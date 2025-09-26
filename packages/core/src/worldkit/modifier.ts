import { Actor, ActorStat } from '~/types';
import { getEffectiveStatBonus, ActorStatApi } from '~/worldkit/entity/actor/stats';
import { SpecialDuration } from '~/types';

export function getActorStatBasedModifier(
  actor: Actor,
  stat: ActorStat,
  actorStatApi?: ActorStatApi,
) {
  const statBonus = actorStatApi
    ? actorStatApi.getEffectiveStatBonus(actor, stat)
    : getEffectiveStatBonus(actor, stat);

  return {
    type: `flux:modifier:initiative:${stat}`,
    origin: { type: `flux:stat:${stat}`, actor: 'self' },
    value: statBonus,
    duration: SpecialDuration.PERMANENT,
  };
}
