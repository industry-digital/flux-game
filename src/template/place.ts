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

export const renderExitDirection: Template<{ direction: string; exit: { label: string } }> = ({ direction, exit }) => {
  // Capitalize the first letter of the direction
  const capitalizedDirection = direction.charAt(0).toUpperCase() + direction.slice(1);

  // Try to extract destination from action description
  // Look for text after the last "to " in the label
  const toIndex = exit.label.lastIndexOf(' to ');
  const destination = toIndex !== -1 ? exit.label.substring(toIndex + 4) : exit.label;

  return `${capitalizedDirection} to ${destination}`;
};

export const renderExits: PlaceTemplate = ({ place }) => {
  const exitEntries = Object.entries(place.exits);

  if (exitEntries.length === 0) {
    return 'Exits: None';
  }

  const exitDescriptions = exitEntries.map(([direction, exit]) => {
    return renderExitDirection({ direction, exit });
  });

  return `Exits: ${exitDescriptions.join(', ')}`;
};

export const renderPlaceDescription: PlaceTemplate = (props: PlaceTemplateProps) => {
  const { place } = props;
  const { base, emergent } = normalizePlaceDescription(place.description);
  const exits = renderExits(props);
  return `${place.name}\n${base}\n${emergent}\n${exits}`;
};

/**
 * @deprecated Use `renderPlaceDescription` instead
 */
export const renderPlaceSummary = renderPlaceDescription;
