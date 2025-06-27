import { Template } from "~/types/template";
import { ActorSummaryLike } from "~/worldkit/view/actor";

export type ActorSummaryProps = {
  actor: ActorSummaryLike;
};

export const renderActorSummary: Template<ActorSummaryProps> = ({ actor }) => {
  return `${actor.name}\n${actor.description}`;
};
