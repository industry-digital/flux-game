import { TransformerContext } from '~/types/handler';
import { EventType } from '~/types/event';
import { ActorURN, PlaceURN } from '~/types/taxonomy';
import { createPlaceSummary } from '~/worldkit/view/place';
import { createActorSummary, ActorSummary } from '~/worldkit/view/actor';
import { renderPlaceDescription } from '~/template/place';
import { Narrative } from '~/types/narrative';

/**
 * Reusable function for generating "look at place" events with proper narrative
 */
export const lookAtPlace = (
  context: TransformerContext,
  actor: ActorURN,
  place: PlaceURN,
  traceId: string
): TransformerContext => {
  const { actors, places } = context.world;
  const actorEntity = actors[actor];
  const placeEntity = places[place];

  if (!actorEntity) {
    context.declareError('Actor not found in world projection', traceId);
    return context;
  }

  if (!placeEntity) {
    context.declareError('Place not found in world projection', traceId);
    return context;
  }

  // Generate place summary and actor summaries for narrative
  const placeSummary = createPlaceSummary(placeEntity, actors, {});
  const actorSummaries: Record<ActorURN, ActorSummary> = {};
  for (const actorId in placeSummary.actors) {
    const actorEntity = actors[actorId as ActorURN];
    if (actorEntity) {
      actorSummaries[actorId as ActorURN] = createActorSummary(actorEntity);
    }
  }

  // Generate narrative using the shared template
  const narrative: Narrative = {
    self: renderPlaceDescription(placeSummary, actorSummaries, actor),
    observer: renderPlaceDescription(placeSummary, actorSummaries, actor),
  };

  // Emit the look event
  context.declareEvent({
    type: EventType.ACTOR_DID_LOOK_AT_PLACE,
    actor: actor,
    location: actorEntity.location!,
    payload: { target: place },
    trace: traceId,
    narrative,
  });

  return context;
};
