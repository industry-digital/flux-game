import { Template } from "~/types/template";
import { PlaceSummary } from "~/worldkit/view/place";

export const renderExits: Template<PlaceSummary> = (place) => {
  return Object.entries(place.exits).map(([direction, exit]) => {
    return `- ${direction}: ${exit.label}`;
  }).join('\n');
};

export const renderPlaceDescription = (place: PlaceSummary) => {
  if (typeof place.description === 'string') {
    return place.description;
  }

  const { base, emergent } = place.description;
  return `${base}\n${emergent}`;
};

export type PlaceSummaryInput = {
  place: PlaceSummary;
};

export const renderPlaceSummary: Template<PlaceSummaryInput> = ({ place }) => {
  const description = renderPlaceDescription(place);
  const exits = renderExits(place);
  return `${place.name}\n${description}\n\n${exits}`;
};
