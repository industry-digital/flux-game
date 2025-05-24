import { DirectionURN, EventType, PlaceURN, Taxonomy, TransformerContext } from '@flux';

export type ActorMovementHook = {
  move: (direction: Taxonomy.Directions) => MoveResult;
};

export type MoveResult =
  | { success: true }
  | { success: false; reason: string; message?: string };

export const useActorMovement = (
  { world, declareEvent }: TransformerContext,
): ActorMovementHook => {
  const { self, actors, places } = world;
  const actor = actors[self];

  if (!actor) {
    throw new Error('Actor not found in `actors` projection');
  }

  const origin = places[actor.location as PlaceURN];
  if (!origin) {
    throw new Error('Origin not found in `places` projection');
  }

  const DEFAULT_ERROR_MESSAGE = "You can't go that way.";

  const declareMovementFailure = (direction: DirectionURN, reason: string, message = DEFAULT_ERROR_MESSAGE): MoveResult => {
    declareEvent({
      type: EventType.ACTOR_MOVEMENT_DID_FAIL,
      payload: {
        actor: actor.id,
        origin: origin.id,
        direction,
        reason,
        message,
      }
    });

    return {
      success: false,
      reason,
      message,
    };
  };

  const declareMovementSuccess = (direction: DirectionURN, destination: PlaceURN): MoveResult => {

    declareEvent({
      type: EventType.ACTOR_MOVEMENT_DID_SUCCEED,
      payload: {
        actor: actor.id,
        direction,
        origin: origin.id,
        destination,
      }
    });

    return { success: true };
  };

  const move = (direction: Taxonomy.Directions): MoveResult => {
    const exit = origin.attributes.exits[direction];
    if (!exit) {
      return declareMovementFailure(direction, 'No exit in that direction');
    }

    const destination = places[exit.to];
    if (!destination) {
      return declareMovementFailure(direction, 'Destination place not found in `places` projection');
    }

    // Assign a new location to the actor
    actor.location = exit.to;

    // Now all we have to do is "transfer" actor's representation from the origin to the destination.
    const descriptor = origin.attributes.entities[actor.id];
    if (!descriptor) {
      return declareMovementFailure(direction, 'Actor not found at `origin`');
    }

    destination.attributes.entities[actor.id] = descriptor;
    delete origin.attributes.entities[actor.id];

    return declareMovementSuccess(direction, exit.to);
  };

  return { move };
};
