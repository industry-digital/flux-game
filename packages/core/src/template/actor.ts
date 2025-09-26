import { EmergentNarrative } from '~/types/entity/entity';
import { Actor } from '~/types/entity/actor';
import { Perspective } from '~/types/narrative';

const renderEmergentNarrative = ({ base, emergent }: EmergentNarrative) => {
  return emergent ? `${base} ${emergent}` : base;
};

export const renderActorSummary = (actor: Actor, perspective: Perspective) => {
  const prefix = perspective === Perspective.SELF ? 'You are' : 'You see';
  return `${prefix} ${actor.name}.\n${renderEmergentNarrative(actor.description)}`;
};
