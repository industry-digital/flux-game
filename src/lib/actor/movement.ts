import { Direction, EventType, PlaceURN, TransformerContext } from '@flux';

export type ActorMovementHook = {
  move: (direction: Direction) => MoveResult;
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

  if (!actor.location) {
    throw new Error('Actor does not have a `location`');
  }

  const origin = places[actor.location];
  if (!origin) {
    throw new Error('Actor location not found in `places` projection');
  }

  const DEFAULT_ERROR_MESSAGE = "You can't go that way.";

  const declareMovementFailure = (direction: Direction, reason: string, message = DEFAULT_ERROR_MESSAGE): MoveResult => {
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

  const declareMovementSuccess = (direction: Direction, destination: PlaceURN): MoveResult => {
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

  const move = (direction: Direction): MoveResult => {
    const exit = origin.attributes.exits[direction];
    if (!exit) {
      return declareMovementFailure(direction, 'No exit in that direction');
    }

    const destination = places[exit.to];
    if (!destination) {
      return declareMovementFailure(direction, 'Destination place not found in `places` projection');
    }

    // Now all we have to do is "transfer" actor's representation from the origin to the destination.
    const descriptor = origin.attributes.entities[actor.id];
    if (!descriptor) {
      return declareMovementFailure(direction, 'Actor not found at `origin`');
    }

    // Transfer actor's descriptor from origin to destination
    destination.attributes.entities[actor.id] = descriptor;
    delete origin.attributes.entities[actor.id];

    // Update actor's location
    actor.location = destination.id;

    return declareMovementSuccess(direction, exit.to);
  };

  return { move };
};
