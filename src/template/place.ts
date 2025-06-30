import { EmergentNarrative } from '~/types';
import { Template } from "~/types/template";
import { PlaceSummaryLike } from "~/worldkit/view/place";

export type PlaceTemplateProps = { place: PlaceSummaryLike };
export type PlaceTemplate = Template<PlaceTemplateProps>;

export const normalizePlaceDescription = (description: string | EmergentNarrative) => {
  if (typeof description === 'string') {
    return { base: description, emergent: '' };
  }
  return description;
};

export const renderExits: PlaceTemplate = ({ place }) => {
  return Object.entries(place.exits).map(([direction, exit]) => {
    return `- ${direction}: ${exit.label}`;
  }).join('\n');
};

export const renderPlaceDescription: PlaceTemplate = ({ place }) => {
  const { base, emergent } = normalizePlaceDescription(place.description);
  const exits = renderExits({ place });
  return `${base}\n${emergent}\n${exits}`;
};

/**
 * @deprecated Use `renderPlaceDescription` instead
 */
export const renderPlaceSummary = renderPlaceDescription;
