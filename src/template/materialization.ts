import { Template, WorldEventMessageDictionary } from '~/types';
import { ActorSummaryLike } from '~/worldkit/view';

export type ActorMaterializationProps = {
  actor: ActorSummaryLike;
  perspective: keyof WorldEventMessageDictionary;
};

export const renderActorDidMaterialize: Template<ActorMaterializationProps> = ({ actor, perspective }) => {
  const subject = perspective === 'actor' ? 'You' : actor.name;
  const verb = perspective === 'actor' ? 'have entered the simulation' : 'enters the simulation';
  return `${subject} ${verb}.`;
};

export const renderActorDidDematerialize: Template<ActorMaterializationProps> = ({ actor, perspective }) => {
  const subject = perspective === 'actor' ? 'You' : actor.name;
  const verb = perspective === 'actor' ? 'have left the simulation' : 'leaves the simulation';
  return `${subject} ${verb}.`;
};
