import { Template } from "~/types/template";
import { ActorSummary } from "~/worldkit/view/actor";

export const renderActorSummary: Template<ActorSummary> = (actor) => {
  return `${actor.name}\n${actor.description}`;
};
