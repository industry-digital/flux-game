import { Actor, Item } from '~/types';
import { Place } from "~/types/entity/place";
import { ActorURN, ItemURN } from '~/types/taxonomy';

export type PlaceSummary = {
  id: Place['id'];
  name: Place['name'];
  description: Place['description'];
  exits: Place['exits'];
  actors: Record<ActorURN, Actor>;
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

export const createPlaceSummary = (place: PlaceLike, actors: Record<ActorURN, Actor>, items: Record<ItemURN, Item>): PlaceSummary => {
  return {
    id: place.id,
    name: place.name,
    description: place.description,
    exits: place.exits,
    actors,
    items,
  };
};
