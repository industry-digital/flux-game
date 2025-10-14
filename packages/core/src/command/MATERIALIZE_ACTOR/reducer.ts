import { PureReducer, TransformerContext } from '~/types/handler';
import { MaterializeActorCommand } from './types';
import { SpecialVisibility } from '~/types/world/visibility';
import { EventType } from '~/types/event';

const EMPTY_PAYLOAD: Readonly<Record<string, never>> = Object.freeze({});

export const materializeActorReducer: PureReducer<TransformerContext, MaterializeActorCommand> = (
  context,
  command,
) => {
  const { declareError, declareEvent } = context;
  const { actors, places } = context.world;

  const actor = actors[command.args.actorId];
  if (!actor) {
    declareError('Actor not found in `actors` projection. Did you remember to load it?');
    return context;
  }

  const place = places[actor.location];
  if (!place) {
    declareError('Place not found in `places` projection. Did you remember to load it?');
    return context;
  }

  // This materializes the actor in its current location
  // FIXME: How do we handle the case where the actor is in stealth? What should be the actor's visibility then?
  place.entities[actor.id] = { vis: SpecialVisibility.VISIBLE_TO_EVERYONE };

  declareEvent({
    type: EventType.ACTOR_DID_MATERIALIZE,
    actor: actor.id,
    location: place.id,
    trace: command.id,
    payload: EMPTY_PAYLOAD,
  });

  return context;
};
