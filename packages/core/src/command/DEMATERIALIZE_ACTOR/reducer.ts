import { PureReducer, TransformerContext } from '~/types/handler';
import { DematerializeActorCommand } from './types';
import { EventType } from '~/types/event';

export const EMPTY_PAYLOAD: Readonly<Record<string, never>> = Object.freeze({});

export const dematerializeActorReducer: PureReducer<TransformerContext, DematerializeActorCommand> = (
  context,
  command,
) => {
  const { declareError, declareEvent } = context;
  const { actors, places } = context.world;
  const actor = actors[command.args.actorId];

  if (!actor) {
    declareError('Actor not found in world projection');
    return context;
  }

  const place = places[actor.location];
  if (!place) {
    declareError('Place not found in `places` projection. Did you remember to load it?');
    return context;
  }

  // Remove the actor from the place
  delete place.entities[actor.id];

  declareEvent({
    type: EventType.ACTOR_DID_DEMATERIALIZE,
    actor: actor.id,
    location: place.id,
    payload: EMPTY_PAYLOAD,
    trace: command.id,
  });

  return context;
};
