import { Template } from '~/types';
import { ActorSummaryLike } from '~/worldkit/view';
import { Perspective } from '~/types/narrative';

export type ActorMaterializationProps = {
  actor: ActorSummaryLike;
  perspective: Perspective;
};

export const renderActorDidMaterialize: Template<ActorMaterializationProps> = ({ actor, perspective }) => {
  const subject = perspective === Perspective.SELF ? 'You' : actor.name;
  const verb = perspective === Perspective.SELF ? 'have entered the simulation' : 'enters the simulation';
  return `${subject} ${verb}.`;
};

export const renderActorDidDematerialize: Template<ActorMaterializationProps> = ({ actor, perspective }) => {
  const subject = perspective === Perspective.SELF ? 'You' : actor.name;
  const verb = perspective === Perspective.SELF ? 'have left the simulation' : 'leaves the simulation';
  return `${subject} ${verb}.`;
};
