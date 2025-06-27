import { Place } from "~/types/entity/place";

export type PlaceSummary = {
  name: Place['name'];
  description: Place['description'];
  exits: Place['exits'];
};

export type PlaceSummaryLike<T extends PlaceSummary = PlaceSummary> = T;

export const createPlaceSummary = (place: PlaceSummaryLike): PlaceSummary => {
  return {
    name: place.name,
    description: place.description,
    exits: place.exits,
  };
};
