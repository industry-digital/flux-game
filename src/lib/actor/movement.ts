import { DirectionURN, EventType, PlaceURN, Taxonomy, TransformerContext } from '~/types';

export type ActorMovementHook = {
  move: (direction: Taxonomy.Directions) => MoveResult;
};

export type MoveResult =
  | { success: true }
  | { success: false; reason: string; message?: string };

export const useActorMovement = (
  context: TransformerContext,
): ActorMovementHook => {
  const { self, actors, places } = context.world;
  const actor = actors[self];

  if (!actor) {
    throw new Error('Actor not found in `actors` projection');
  }

  const origin = places[actor.location as PlaceURN];
  if (!origin) {
    throw new Error('Origin not found in `places` projection');
  }

  const DEFAULT_ERROR_MESSAGE = "You can't go that way.";

  const declareMovementFailure = (reason: string, message?: string): MoveResult => {
    context.declareEvent({
      type: EventType.ACTOR_MOVEMENT_DID_FAIL,
      payload: {
        actor: actor.id,
        origin: origin.id,
        reason,
        message: message || DEFAULT_ERROR_MESSAGE
      }
    });

    return {
      success: false,
      reason,
      message: message || DEFAULT_ERROR_MESSAGE,
    };
  };

  const declareMovementSuccess = (destination: PlaceURN, direction: DirectionURN): MoveResult => {
    context.declareEvent({
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
      return declareMovementFailure('No exit in that direction');
    }

    const destination = places[exit.to];
    if (!destination) {
      return declareMovementFailure('Destination place not found in `places` projection');
    }

    // Assign a new location to the actor
    actor.location = exit.to;

    // Transfer the actor's representation to the destination
    const descriptor = origin.attributes.entities[actor.id];
    if (!descriptor) {
      return declareMovementFailure('Actor not found at `origin`');
    }

    destination.attributes.entities[actor.id] = descriptor;
    delete origin.attributes.entities[actor.id];

    return declareMovementSuccess(destination.id, direction);
  };

  return { move };
};
