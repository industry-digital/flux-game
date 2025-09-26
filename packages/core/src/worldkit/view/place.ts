import { Actor, Item } from '~/types';
import { Place } from "~/types/entity/place";
import { ActorURN, ItemURN } from '~/types/taxonomy';
import { ActorSummary } from '~/worldkit/view/actor';

export type PlaceSummary = {
  id: Place['id'];
  name: Place['name'];
  description: Place['description'];
  exits: Place['exits'];
  actors: Record<ActorURN, ActorSummary>;
  items: Record<ItemURN, Item>;
};

export type PlaceLike = {
  id: Place['id'];
  name: Place['name'];
  description: Place['description'];
  exits: Place['exits'];
  entities: Place['entities'];
};

export type PlaceSummaryLike<T extends PlaceSummary = PlaceSummary> = T;

export const createPlaceSummary = (place: PlaceLike, actorsInPlace: Record<ActorURN, Actor>, items: Record<ItemURN, Item>): PlaceSummary => {
  return {
    id: place.id,
    name: place.name,
    description: place.description,
    exits: place.exits,
    actors: actorsInPlace,
    items,
  };
};
