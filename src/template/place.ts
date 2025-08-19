import { EmergentNarrative } from '~/types';
import { Template } from "~/types/template";
import { PlaceSummaryLike } from "~/worldkit/view/place";
import { ActorURN } from '~/types/taxonomy';

export type PlaceTemplateProps = {
  place: PlaceSummaryLike;
  viewer?: ActorURN;
};

export type PlaceTemplate = Template<PlaceTemplateProps>;

export const normalizePlaceDescription = (description: string | EmergentNarrative) => {
  if (typeof description === 'string') {
    return { base: description, emergent: '' };
  }
  return description;
};

export const renderRoomName = ({ place }: PlaceTemplateProps): string => {
  return `[${place.name}]`;
};

export const renderDescription = ({ place }: PlaceTemplateProps): string => {
  const { base, emergent } = normalizePlaceDescription(place.description);
  const parts = [base];

  if (emergent) {
    parts.push(emergent);
  }

  return parts.join(' ');
};

export const renderActors = ({ place, viewer }: PlaceTemplateProps): string | null => {
  if (!place.actors || Object.keys(place.actors).length === 0) {
    return null;
  }

  // Get visible actors (excluding viewer if present)
  const visibleActors = Object.entries(place.actors)
    .filter(([id, actor]) => {
      if (viewer && id === viewer) {
        return false;
      }
      return true; // For now, assume all actors are visible
    })
    .map(([_, actor]) => actor.name);

  if (visibleActors.length === 0) {
    return null;
  }

  return `Also here: ${visibleActors.join(', ')}.`;
};

export type RenderExitsProps = PlaceTemplateProps & { prefix?: string };

export const renderExits = ({ place, prefix = 'Exits:' }: RenderExitsProps): string => {
  const exitDirections = Object.keys(place.exits);

  if (exitDirections.length === 0) {
    return `${prefix} none.`;
  }

  // Convert directions to lowercase and sort them
  const formattedDirections = exitDirections
    .map(dir => dir.toLowerCase())
    .sort()
    .join(', ');

  return `${prefix} ${formattedDirections}.`;
};

export const renderPlaceDescription: PlaceTemplate = (props: PlaceTemplateProps) => {
  const sections = [
    renderRoomName(props),
    renderDescription(props)
  ];

  const actorsSection = renderActors(props);
  if (actorsSection) {
    sections.push(actorsSection);
  }

  sections.push(renderExits(props));

  return sections.join('\n');
};

/**
 * @deprecated Use `renderPlaceDescription` instead
 */
export const renderPlaceSummary = renderPlaceDescription;
