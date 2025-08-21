import { WorldEventMessageDictionary } from '~/types/fact';
import { EmergentNarrative } from '~/types/entity/entity';
import { Template } from "~/types/template";
import { ActorSummaryLike } from "~/worldkit/view/actor";

export type ActorSummaryProps = {
  actor: ActorSummaryLike;
  perspective: keyof WorldEventMessageDictionary;
};

const renderEmergentNarrative = ({ base, emergent }: EmergentNarrative) => {
  return emergent ? `${base} ${emergent}` : base;
};

export const renderActorSummary: Template<ActorSummaryProps> = ({ actor, perspective }) => {
  const prefix = perspective === 'actor' ? 'You are' : 'You see';

  return `${prefix} ${actor.name}.\n${renderEmergentNarrative(actor.description)}`;
};
