import { WorldEventMessageDictionary } from '~/types/fact';
import { Template } from "~/types/template";
import { ActorSummaryLike } from "~/worldkit/view/actor";

export type ActorSummaryProps = {
  actor: ActorSummaryLike;
  perspective: keyof WorldEventMessageDictionary;
};

export const renderActorSummary: Template<ActorSummaryProps> = ({ actor, perspective }) => {
  const prefix = perspective === 'actor' ? 'You are' : 'You see';
  return `${prefix} ${actor.name}.\n${actor.description}`;
};
