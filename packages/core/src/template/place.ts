import { EmergentNarrative } from '~/types';
import { Template } from "~/types/template";
import { PlaceSummary, PlaceSummaryLike } from "~/worldkit/view/place";
import { ActorURN } from '~/types/taxonomy';
import { ActorSummary } from '~/worldkit/view';

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

export const renderRoomName = (place: PlaceSummary): string => {
  return `[${place.name}]`;
};

export const renderDescription = (place: PlaceSummary): string => {
  const { base, emergent } = normalizePlaceDescription(place.description);
  const parts = [base];

  if (emergent) {
    parts.push(emergent);
  }

  return parts.join(' ');
};

export const renderActorsInPlace = (place: PlaceSummary, actorSummaries: Record<ActorURN, ActorSummary>, viewer: ActorURN): string => {
  const visibleActors: string[] = [];

  for (const actorId in place.actors) {
    if (actorId !== viewer) {
      const actor = actorSummaries[actorId as ActorURN];
      if (actor) {
        visibleActors.push(actor.name);
      }
    }
  }

  if (visibleActors.length === 0) {
    return '';
  }

  return `Also here: ${visibleActors.join(', ')}.`;
};

export const renderExits = (place: PlaceSummary, prefix: string = 'Exits:'): string => {
  const exitDirections = Object.keys(place.exits);

  if (exitDirections.length === 0) {
    return `${prefix} none.`;
  }

  // Single-pass lowercase and sort
  const directions: string[] = [];
  for (const direction of exitDirections) {
    directions.push(direction.toLowerCase());
  }
  directions.sort();

  return `${prefix} ${directions.join(', ')}.`;
};

export const renderPlaceDescription = (
  place: PlaceSummary,
  actorSummaries: Record<ActorURN, ActorSummary>,
  viewer: ActorURN
): string => {
  const sections = [
    renderRoomName(place),
    renderDescription(place)
  ];

  const actorsSection = renderActorsInPlace(place, actorSummaries, viewer);
  if (actorsSection) {
    sections.push(actorsSection);
  }

  sections.push(renderExits(place));

  return sections.join('\n');
};

/**
 * @deprecated Use `renderPlaceDescription` instead
 */
export const renderPlaceSummary = renderPlaceDescription;
