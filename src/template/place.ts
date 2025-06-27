import { Template } from "~/types/template";
import { PlaceSummaryLike } from "~/worldkit/view/place";

export type PlaceTemplateProps = { place: PlaceSummaryLike };
export type PlaceTemplate = Template<PlaceTemplateProps>;

export const renderExits: PlaceTemplate = ({ place }) => {
  return Object.entries(place.exits).map(([direction, exit]) => {
    return `- ${direction}: ${exit.label}`;
  }).join('\n');
};

export const renderPlaceDescription: PlaceTemplate = ({ place }) => {
  if (typeof place.description === 'string') {
    return place.description;
  }

  const { base, emergent } = place.description;
  return `${base}\n${emergent}`;
};

export const renderPlaceSummary: PlaceTemplate = (props) => {
  const description = renderPlaceDescription(props);
  const exits = renderExits(props);

  return `${props.place.name}\n${description}\n\n${exits}`;
};
