import { Place } from "~/types/entity/place";

export type PlaceSummary = {
  name: Place['name'];
  description: Place['description'];
  exits: Place['exits'];
};

export const createPlaceSummary = (place: Place): PlaceSummary => {
  return {
    name: place.name,
    description: place.description,
    exits: place.exits,
  };
};
