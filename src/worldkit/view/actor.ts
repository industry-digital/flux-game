import { Actor } from "~/types/entity/actor";

export type ActorSummary = {
  name: Actor['name'];
  description: Actor['description'];
};

export const createActorSummary = <ActorLike extends ActorSummary>(actor: ActorLike): ActorSummary => {
  return {
    name: actor.name,
    description: actor.description,
  };
};
