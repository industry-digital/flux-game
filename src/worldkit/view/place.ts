import { Place } from "~/types/entity/place";

export type PlaceSummary = {
  id: Place['id'];
  name: Place['name'];
  description: Place['description'];
  exits: Place['exits'];
};

export type PlaceSummaryLike<T extends PlaceSummary = PlaceSummary> = T;

export const createPlaceSummary = (place: PlaceSummaryLike): PlaceSummary => {
  return {
    id: place.id,
    name: place.name,
    description: place.description,
    exits: place.exits,
  };
};
