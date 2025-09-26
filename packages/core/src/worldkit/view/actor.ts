import { Actor } from "~/types/entity/actor";

export type ActorSummary = {
  name: Actor['name'];
  description: Actor['description'];
};

export type ActorSummaryLike<T extends ActorSummary = ActorSummary> = T;

export const createActorSummary = (actor: ActorSummaryLike): ActorSummary => {
  return {
    name: actor.name,
    description: actor.description,
  };
};
